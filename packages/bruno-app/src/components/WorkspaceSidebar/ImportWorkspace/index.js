import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconFileZip, IconFolder, IconLoader2, IconCheck, IconX } from '@tabler/icons';
import Modal from 'components/Modal';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { importWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { formatIpcError } from 'utils/common/error';
import { multiLineMsg } from 'utils/common/index';
import Help from 'components/Help';

const TABS = {
  BRUNO: 'bruno',
  POSTMAN: 'postman',
  OPEN_FOLDER: 'open_folder'
};

const STATUS = {
  PENDING: 'pending',
  CONVERTING: 'converting',
  CREATING: 'creating',
  SUCCESS: 'success',
  ERROR: 'error',
  SKIPPED: 'skipped'
};

const ImportWorkspace = ({ onClose }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const [activeTab, setActiveTab] = useState(TABS.BRUNO);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const locationInputRef = useRef(null);

  // Postman backup state
  const [postmanFolderPath, setPostmanFolderPath] = useState(null);
  const [scannedWorkspaces, setScannedWorkspaces] = useState([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState([]);
  const [importStarted, setImportStarted] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState({});
  const [isScanning, setIsScanning] = useState(false);

  // Open folder state
  const [openFolderPath, setOpenFolderPath] = useState(null);
  const [scannedBrunoWorkspaces, setScannedBrunoWorkspaces] = useState([]);
  const [selectedBrunoWorkspaces, setSelectedBrunoWorkspaces] = useState([]);
  const [openStarted, setOpenStarted] = useState(false);
  const [openWorkspaceStatus, setOpenWorkspaceStatus] = useState({});
  const [isScanningBruno, setIsScanningBruno] = useState(false);

  const defaultLocation = get(preferences, 'general.defaultLocation', '');

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      workspaceLocation: defaultLocation
    },
    validationSchema: Yup.object({
      workspaceLocation: Yup.string().min(1, 'location is required').required('location is required')
    }),
    onSubmit: async (values) => {
      if (isSubmitting) return;

      if (activeTab === TABS.BRUNO) {
        if (!selectedFile) return;
        try {
          setIsSubmitting(true);
          await dispatch(importWorkspaceAction(selectedFile.path, values.workspaceLocation));
          toast.success('Workspace imported successfully!');
          onClose();
        } catch (error) {
          toast.error(multiLineMsg('Failed to import workspace', formatIpcError(error)));
        } finally {
          setIsSubmitting(false);
        }
      } else if (activeTab === TABS.POSTMAN) {
        if (!postmanFolderPath || selectedWorkspaces.length === 0) return;
        try {
          setIsSubmitting(true);
          setImportStarted(true);

          const initialStatus = {};
          selectedWorkspaces.forEach((ws) => {
            initialStatus[ws.name] = STATUS.PENDING;
          });
          setWorkspaceStatus(initialStatus);

          const workspacesToImport = scannedWorkspaces.filter((ws) =>
            selectedWorkspaces.some((s) => s.name === ws.name)
          );

          await window.ipcRenderer.invoke(
            'renderer:import-postman-workspaces',
            postmanFolderPath,
            values.workspaceLocation,
            workspacesToImport
          );
        } catch (error) {
          toast.error(multiLineMsg('Failed to import workspaces', formatIpcError(error)));
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  });

  // Listen for progress events
  useEffect(() => {
    const { ipcRenderer } = window;
    if (!ipcRenderer) return;

    const handleProgress = (data) => {
      setWorkspaceStatus((prev) => ({
        ...prev,
        [data.workspace]: data.status
      }));
    };

    const handleOpenProgress = (data) => {
      setOpenWorkspaceStatus((prev) => ({
        ...prev,
        [data.workspace]: data.status
      }));
    };

    const unsubscribe = ipcRenderer.on('main:postman-workspace-import-progress', handleProgress);
    const unsubscribeOpen = ipcRenderer.on('main:bulk-open-workspace-progress', handleOpenProgress);
    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeOpen) unsubscribeOpen();
    };
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndGetFilePath = (file) => {
    if (!file) return null;

    const isZip = file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
    if (!isZip) {
      toast.error('Please select a valid zip file');
      return null;
    }

    const filePath = window?.ipcRenderer?.getFilePath(file);
    if (!filePath) {
      toast.error('Could not get file path');
      return null;
    }

    return { name: file.name, path: filePath };
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileInfo = validateAndGetFilePath(e.dataTransfer.files[0]);
      if (fileInfo) {
        setSelectedFile(fileInfo);
      }
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const fileInfo = validateAndGetFilePath(e.target.files[0]);
      if (fileInfo) {
        setSelectedFile(fileInfo);
      }
    }
  };

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string' && dirPath.length > 0) {
          formik.setFieldValue('workspaceLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('workspaceLocation', '');
        console.error(error);
      });
  };

  const browsePostmanFolder = async () => {
    try {
      const dirPath = await dispatch(browseDirectory());
      if (typeof dirPath === 'string' && dirPath.length > 0) {
        setPostmanFolderPath(dirPath);
        setIsScanning(true);
        setScannedWorkspaces([]);
        setSelectedWorkspaces([]);

        const result = await window.ipcRenderer.invoke('renderer:scan-postman-backup-folder', dirPath);
        setScannedWorkspaces(result.workspaces);
        setSelectedWorkspaces(result.workspaces);
        setIsScanning(false);
      }
    } catch (error) {
      setIsScanning(false);
      toast.error('Failed to scan folder: ' + (error.message || 'Unknown error'));
    }
  };

  const browseWorkspacesFolder = async () => {
    try {
      const dirPath = await dispatch(browseDirectory());
      if (typeof dirPath === 'string' && dirPath.length > 0) {
        setOpenFolderPath(dirPath);
        setIsScanningBruno(true);
        setScannedBrunoWorkspaces([]);
        setSelectedBrunoWorkspaces([]);

        const result = await window.ipcRenderer.invoke('renderer:scan-workspaces-folder', dirPath);
        setScannedBrunoWorkspaces(result.workspaces);
        setSelectedBrunoWorkspaces(result.workspaces);
        setIsScanningBruno(false);
      }
    } catch (error) {
      setIsScanningBruno(false);
      toast.error('Failed to scan folder: ' + (error.message || 'Unknown error'));
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleWorkspaceToggle = (ws) => {
    setSelectedWorkspaces((prev) =>
      prev.some((s) => s.name === ws.name)
        ? prev.filter((s) => s.name !== ws.name)
        : [...prev, ws]
    );
  };

  const handleSelectAll = (e) => {
    setSelectedWorkspaces(e.target.checked ? scannedWorkspaces : []);
  };

  useEffect(() => {
    if (locationInputRef && locationInputRef.current) {
      locationInputRef.current.focus();
    }
  }, [locationInputRef]);

  const canSubmitBruno = selectedFile && formik.values.workspaceLocation && !isSubmitting;
  const canSubmitPostman = postmanFolderPath && selectedWorkspaces.length > 0 && formik.values.workspaceLocation && !isSubmitting;
  const canSubmitOpenFolder = openFolderPath && selectedBrunoWorkspaces.length > 0 && !isSubmitting;
  const canSubmit = activeTab === TABS.BRUNO ? canSubmitBruno : activeTab === TABS.POSTMAN ? canSubmitPostman : canSubmitOpenFolder;

  const getConfirmText = () => {
    if (importStarted || openStarted) return 'Close';
    if (isSubmitting) return activeTab === TABS.OPEN_FOLDER ? 'Opening...' : 'Importing...';
    return activeTab === TABS.OPEN_FOLDER ? 'Open' : 'Import';
  };

  const handleOpenFolderSubmit = async () => {
    if (!openFolderPath || selectedBrunoWorkspaces.length === 0 || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setOpenStarted(true);

      const initialStatus = {};
      selectedBrunoWorkspaces.forEach((ws) => {
        initialStatus[ws.folderName] = STATUS.PENDING;
      });
      setOpenWorkspaceStatus(initialStatus);

      const paths = selectedBrunoWorkspaces.map((ws) => ws.path);
      await window.ipcRenderer.invoke('renderer:bulk-open-workspaces', paths);
      toast.success(`Opened ${selectedBrunoWorkspaces.length} workspaces`);
    } catch (error) {
      toast.error(multiLineMsg('Failed to open workspaces', formatIpcError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (importStarted || openStarted) {
      onClose();
    } else if (activeTab === TABS.OPEN_FOLDER) {
      handleOpenFolderSubmit();
    } else {
      formik.handleSubmit();
    }
  };

  const allSelected = selectedWorkspaces.length === scannedWorkspaces.length;

  const totalCollections = scannedWorkspaces
    .filter((ws) => selectedWorkspaces.some((s) => s.name === ws.name))
    .reduce((acc, ws) => acc + ws.collectionCount, 0);
  const totalEnvironments = scannedWorkspaces
    .filter((ws) => selectedWorkspaces.some((s) => s.name === ws.name))
    .reduce((acc, ws) => acc + ws.environmentCount, 0);

  return (
    <Modal
      size="md"
      title="Import Workspace"
      confirmText={getConfirmText()}
      handleConfirm={handleConfirm}
      handleCancel={onClose}
      confirmDisabled={!canSubmit && !importStarted && !openStarted}
      hideCancel={importStarted || openStarted}
    >
      <div className="flex flex-col">
        {/* Tabs */}
        {!importStarted && !openStarted && (
          <div className="flex gap-4 mb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className={`pb-2 text-sm font-medium ${
                activeTab === TABS.BRUNO
                  ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab(TABS.BRUNO)}
            >
              Bruno Workspace
            </button>
            <button
              type="button"
              className={`pb-2 text-sm font-medium ${
                activeTab === TABS.POSTMAN
                  ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab(TABS.POSTMAN)}
            >
              Postman Backup
            </button>
            <button
              type="button"
              className={`pb-2 text-sm font-medium ${
                activeTab === TABS.OPEN_FOLDER
                  ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab(TABS.OPEN_FOLDER)}
            >
              Open Workspaces Folder
            </button>
          </div>
        )}

        {/* Bruno Workspace Tab */}
        {activeTab === TABS.BRUNO && !importStarted && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Workspace File</h3>
            {selectedFile ? (
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <IconFileZip size={20} className="text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  className="text-gray-500 hover:text-red-500 text-sm"
                  onClick={handleClearFile}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-6 transition-colors duration-200
                  ${dragActive ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                `}
              >
                <div className="flex flex-col items-center justify-center">
                  <IconFileZip
                    size={28}
                    className="text-gray-400 dark:text-gray-500 mb-3"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInputChange}
                    accept=".zip,application/zip,application/x-zip-compressed"
                  />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Drop workspace zip file here or{' '}
                    <button
                      type="button"
                      className="text-blue-500 underline cursor-pointer"
                      onClick={handleBrowseFiles}
                    >
                      choose a file
                    </button>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supports exported Bruno workspace zip files
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Postman Backup Tab */}
        {activeTab === TABS.POSTMAN && !importStarted && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Postman Backup Folder</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Select the folder containing your Postman workspace exports. Each subfolder should have collections/ and environments/ directories.
            </p>

            {postmanFolderPath ? (
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 mb-3">
                <div className="flex items-center gap-2">
                  <IconFolder size={20} className="text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm truncate">{postmanFolderPath}</span>
                </div>
                <button
                  type="button"
                  className="text-gray-500 hover:text-red-500 text-sm ml-2 flex-shrink-0"
                  onClick={() => {
                    setPostmanFolderPath(null);
                    setScannedWorkspaces([]);
                    setSelectedWorkspaces([]);
                  }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full border-2 border-dashed rounded-lg p-6 transition-colors duration-200 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                onClick={browsePostmanFolder}
              >
                <div className="flex flex-col items-center justify-center">
                  <IconFolder size={28} className="text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">
                    Click to select Postman backup folder
                  </p>
                </div>
              </button>
            )}

            {isScanning && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <IconLoader2 size={16} className="animate-spin" />
                Scanning folder...
              </div>
            )}

            {scannedWorkspaces.length > 0 && (
              <div>
                <div className="font-semibold mb-2 flex justify-between items-center">
                  <span>Workspaces ({scannedWorkspaces.length})</span>
                  <label className="flex items-center text-sm font-normal select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="mr-2"
                    />
                    Select All
                  </label>
                </div>
                <div className="max-h-[200px] overflow-y-auto border border-slate-600 rounded-md py-2">
                  {scannedWorkspaces.map((ws) => (
                    <label
                      key={ws.name}
                      className="flex items-center px-4 py-1.5 text-sm font-normal select-none cursor-pointer justify-between"
                    >
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          checked={selectedWorkspaces.some((s) => s.name === ws.name)}
                          onChange={() => handleWorkspaceToggle(ws)}
                          className="mr-3"
                        />
                        <span>{ws.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {ws.collectionCount}c / {ws.environmentCount}e
                      </span>
                    </label>
                  ))}
                </div>
                {selectedWorkspaces.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedWorkspaces.length} workspaces selected ({totalCollections} collections, {totalEnvironments} environments)
                  </p>
                )}
              </div>
            )}

            {postmanFolderPath && !isScanning && scannedWorkspaces.length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                No Postman workspace folders found. Each subfolder should contain a collections/ directory with .json files.
              </p>
            )}
          </div>
        )}

        {/* Open Workspaces Folder Tab */}
        {activeTab === TABS.OPEN_FOLDER && !openStarted && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Workspaces Folder</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Select a folder containing Bruno workspaces. Each subfolder with a workspace.yml will be detected.
            </p>

            {openFolderPath ? (
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 mb-3">
                <div className="flex items-center gap-2">
                  <IconFolder size={20} className="text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm truncate">{openFolderPath}</span>
                </div>
                <button
                  type="button"
                  className="text-gray-500 hover:text-red-500 text-sm ml-2 flex-shrink-0"
                  onClick={() => {
                    setOpenFolderPath(null);
                    setScannedBrunoWorkspaces([]);
                    setSelectedBrunoWorkspaces([]);
                  }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full border-2 border-dashed rounded-lg p-6 transition-colors duration-200 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                onClick={browseWorkspacesFolder}
              >
                <div className="flex flex-col items-center justify-center">
                  <IconFolder size={28} className="text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">
                    Click to select workspaces folder
                  </p>
                </div>
              </button>
            )}

            {isScanningBruno && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <IconLoader2 size={16} className="animate-spin" />
                Scanning folder...
              </div>
            )}

            {scannedBrunoWorkspaces.length > 0 && (
              <div>
                <div className="font-semibold mb-2 flex justify-between items-center">
                  <span>Workspaces ({scannedBrunoWorkspaces.length})</span>
                  <label className="flex items-center text-sm font-normal select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBrunoWorkspaces.length === scannedBrunoWorkspaces.length}
                      onChange={(e) => setSelectedBrunoWorkspaces(e.target.checked ? scannedBrunoWorkspaces : [])}
                      className="mr-2"
                    />
                    Select All
                  </label>
                </div>
                <div className="max-h-[200px] overflow-y-auto border border-slate-600 rounded-md py-2">
                  {scannedBrunoWorkspaces.map((ws) => (
                    <label
                      key={ws.path}
                      className="flex items-center px-4 py-1.5 text-sm font-normal select-none cursor-pointer justify-between"
                    >
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          checked={selectedBrunoWorkspaces.some((s) => s.path === ws.path)}
                          onChange={() => setSelectedBrunoWorkspaces((prev) =>
                            prev.some((s) => s.path === ws.path)
                              ? prev.filter((s) => s.path !== ws.path)
                              : [...prev, ws]
                          )}
                          className="mr-3"
                        />
                        <span>{ws.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {ws.collectionCount}c / {ws.environmentCount}e
                      </span>
                    </label>
                  ))}
                </div>
                {selectedBrunoWorkspaces.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedBrunoWorkspaces.length} workspaces selected
                  </p>
                )}
              </div>
            )}

            {openFolderPath && !isScanningBruno && scannedBrunoWorkspaces.length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                No Bruno workspaces found. Each subfolder should contain a workspace.yml file.
              </p>
            )}
          </div>
        )}

        {/* Open Workspaces Progress */}
        {openStarted && (
          <div className="mb-4">
            <div className="font-semibold mb-2">
              Opening Workspaces ({selectedBrunoWorkspaces.length})
            </div>
            <div className="max-h-[300px] overflow-y-auto border border-slate-600 rounded-md py-2">
              {selectedBrunoWorkspaces.map((ws) => (
                <div
                  key={ws.path}
                  className="flex items-center px-4 py-1.5 text-sm font-normal justify-between"
                >
                  <div className="flex items-center flex-1">
                    <div className="flex items-center mr-2">
                      {(!openWorkspaceStatus[ws.folderName] || openWorkspaceStatus[ws.folderName] === STATUS.PENDING) && (
                        <div className="w-4 h-4" />
                      )}
                      {openWorkspaceStatus[ws.folderName] === STATUS.SUCCESS && (
                        <IconCheck className="text-green-500" size={16} strokeWidth={1.5} />
                      )}
                      {openWorkspaceStatus[ws.folderName] === STATUS.ERROR && (
                        <IconX className="text-red-500" size={16} strokeWidth={1.5} />
                      )}
                    </div>
                    <span>{ws.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {openWorkspaceStatus[ws.folderName] === STATUS.SUCCESS && 'Opened'}
                    {openWorkspaceStatus[ws.folderName] === STATUS.ERROR && 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Progress */}
        {importStarted && (
          <div className="mb-4">
            <div className="font-semibold mb-2">
              Importing Workspaces ({selectedWorkspaces.length})
            </div>
            <div className="max-h-[300px] overflow-y-auto border border-slate-600 rounded-md py-2">
              {selectedWorkspaces.map((ws) => (
                <div
                  key={ws.name}
                  className="flex items-center px-4 py-1.5 text-sm font-normal justify-between"
                >
                  <div className="flex items-center flex-1">
                    <div className="flex items-center mr-2">
                      {(!workspaceStatus[ws.name] || workspaceStatus[ws.name] === STATUS.PENDING) && (
                        <div className="w-4 h-4" />
                      )}
                      {(workspaceStatus[ws.name] === STATUS.CONVERTING || workspaceStatus[ws.name] === STATUS.CREATING) && (
                        <IconLoader2 className="animate-spin text-blue-500" size={16} strokeWidth={1.5} />
                      )}
                      {workspaceStatus[ws.name] === STATUS.SUCCESS && (
                        <IconCheck className="text-green-500" size={16} strokeWidth={1.5} />
                      )}
                      {workspaceStatus[ws.name] === STATUS.ERROR && (
                        <IconX className="text-red-500" size={16} strokeWidth={1.5} />
                      )}
                      {workspaceStatus[ws.name] === STATUS.SKIPPED && (
                        <IconCheck className="text-yellow-500" size={16} strokeWidth={1.5} />
                      )}
                    </div>
                    <span>{ws.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {workspaceStatus[ws.name] === STATUS.CONVERTING && 'Converting...'}
                    {workspaceStatus[ws.name] === STATUS.CREATING && 'Creating workspace...'}
                    {workspaceStatus[ws.name] === STATUS.SUCCESS && `${ws.collectionCount}c / ${ws.environmentCount}e`}
                    {workspaceStatus[ws.name] === STATUS.SKIPPED && 'Already exists'}
                    {workspaceStatus[ws.name] === STATUS.ERROR && 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extract Location (not needed for Open Folder tab) */}
        {!importStarted && !openStarted && activeTab !== TABS.OPEN_FOLDER && (
          <div className="mb-4">
            <label htmlFor="workspace-location" className="font-semibold mb-2 flex items-center">
              Extract Location
              <Help>
                <p>
                  Choose the location where you want to create the workspace(s).
                </p>
                <p className="mt-2">
                  A folder will be created for each workspace at this location.
                </p>
              </Help>
            </label>
            <input
              id="workspace-location"
              type="text"
              name="workspaceLocation"
              ref={locationInputRef}
              readOnly={true}
              className="block textbox mt-2 w-full cursor-pointer"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.workspaceLocation || ''}
              onClick={browse}
            />
            {formik.touched.workspaceLocation && formik.errors.workspaceLocation ? (
              <div className="text-red-500 text-sm mt-1">{formik.errors.workspaceLocation}</div>
            ) : null}
            <div className="mt-1">
              <span
                className="text-link cursor-pointer hover:underline"
                onClick={browse}
              >
                Browse
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportWorkspace;
