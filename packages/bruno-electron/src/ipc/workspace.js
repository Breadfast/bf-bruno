const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const archiver = require('archiver');
const extractZip = require('extract-zip');
const { ipcMain, dialog } = require('electron');
const isDev = require('electron-is-dev');
const { createDirectory, sanitizeName, writeFile, DEFAULT_GITIGNORE, safeWriteFileSync } = require('../utils/filesystem');
const brunoConverters = require('@usebruno/converters');
const { postmanToBruno, postmanToBrunoEnvironment } = brunoConverters;
const yaml = require('js-yaml');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const { globalEnvironmentsManager } = require('../store/workspace-environments');
const { globalEnvironmentsStore } = require('../store/global-environments');

const {
  createWorkspaceConfig,
  readWorkspaceConfig,
  writeWorkspaceConfig,
  validateWorkspaceConfig,
  updateWorkspaceName,
  updateWorkspaceDocs,
  addCollectionToWorkspace,
  removeCollectionFromWorkspace,
  reorderWorkspaceCollections,
  getWorkspaceCollections,
  normalizeCollectionEntry,
  validateWorkspacePath,
  validateWorkspaceDirectory,
  getWorkspaceUid
} = require('../utils/workspace-config');

const { isValidCollectionDirectory } = require('../utils/filesystem');

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

const prepareWorkspaceConfigForClient = (workspaceConfig, workspacePath, isDefault) => {
  const collections = workspaceConfig.collections || [];
  const filteredCollections = collections
    .map((collection) => {
      if (collection.path && !path.isAbsolute(collection.path)) {
        return { ...collection, path: path.resolve(workspacePath, collection.path) };
      }
      return collection;
    })
    .filter((collection) => collection.path && isValidCollectionDirectory(collection.path));

  const config = {
    ...workspaceConfig,
    collections: filteredCollections
  };

  if (isDefault) {
    return {
      ...config,
      name: DEFAULT_WORKSPACE_NAME,
      type: 'default'
    };
  }
  return config;
};

const registerWorkspaceIpc = (mainWindow, workspaceWatcher) => {
  const lastOpenedWorkspaces = new LastOpenedWorkspaces();

  ipcMain.handle('renderer:create-workspace',
    async (event, workspaceName, workspaceFolderName, workspaceLocation) => {
      try {
        workspaceFolderName = sanitizeName(workspaceFolderName);
        const dirPath = path.join(workspaceLocation, workspaceFolderName);

        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          if (files.length > 0) {
            throw new Error(`workspace: ${dirPath} already exists and is not empty`);
          }
        }

        validateWorkspaceDirectory(dirPath);

        if (!fs.existsSync(dirPath)) {
          await createDirectory(dirPath);
        }

        await createDirectory(path.join(dirPath, 'collections'));

        const workspaceUid = getWorkspaceUid(dirPath);
        const isDefault = workspaceUid === 'default';
        const workspaceConfig = createWorkspaceConfig(workspaceName);

        await writeWorkspaceConfig(dirPath, workspaceConfig);
        await writeFile(path.join(dirPath, '.gitignore'), DEFAULT_GITIGNORE);

        lastOpenedWorkspaces.add(dirPath);

        const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, dirPath, isDefault);

        mainWindow.webContents.send('main:workspace-opened', dirPath, workspaceUid, configForClient);

        if (workspaceWatcher) {
          workspaceWatcher.addWatcher(mainWindow, dirPath);
        }

        return {
          workspaceConfig: configForClient,
          workspaceUid,
          workspacePath: dirPath
        };
      } catch (error) {
        throw error;
      }
    });

  ipcMain.handle('renderer:open-workspace', async (event, workspacePath) => {
    try {
      validateWorkspacePath(workspacePath);

      const workspaceConfig = readWorkspaceConfig(workspacePath);
      validateWorkspaceConfig(workspaceConfig);

      const workspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = workspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);

      lastOpenedWorkspaces.add(workspacePath);

      mainWindow.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }

      return {
        workspaceConfig: configForClient,
        workspaceUid,
        workspacePath
      };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:open-workspace-dialog', async (event) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Open Workspace',
        buttonLabel: 'Open Workspace'
      });

      if (canceled || filePaths.length === 0) {
        return null;
      }

      const workspacePath = filePaths[0];
      validateWorkspacePath(workspacePath);

      const workspaceConfig = readWorkspaceConfig(workspacePath);
      validateWorkspaceConfig(workspaceConfig);

      const workspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = workspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);

      lastOpenedWorkspaces.add(workspacePath);

      mainWindow.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }

      return {
        workspaceConfig: configForClient,
        workspaceUid,
        workspacePath
      };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:load-workspace-collections', async (event, workspacePath) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is undefined');
      }

      validateWorkspacePath(workspacePath);
      return getWorkspaceCollections(workspacePath);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:reorder-workspace-collections', async (event, workspacePath, collectionPaths) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is undefined');
      }
      validateWorkspacePath(workspacePath);
      await reorderWorkspaceCollections(workspacePath, collectionPaths);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:load-workspace-apispecs', async (event, workspacePath) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is undefined');
      }

      const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

      if (!fs.existsSync(workspaceFilePath)) {
        throw new Error('Invalid workspace: workspace.yml not found');
      }

      const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
      const workspaceConfig = yaml.load(yamlContent);

      if (!workspaceConfig || typeof workspaceConfig !== 'object') {
        return [];
      }

      const specs = workspaceConfig.specs || [];

      const resolvedSpecs = specs
        .map((spec) => {
          if (spec.path && !path.isAbsolute(spec.path)) {
            return {
              ...spec,
              path: path.join(workspacePath, spec.path)
            };
          }
          return spec;
        })
        .filter((spec) => spec.path && fs.existsSync(spec.path));

      return resolvedSpecs;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:get-last-opened-workspaces', async () => {
    try {
      const workspacePaths = lastOpenedWorkspaces.getAll();
      const validWorkspaces = [];
      const invalidPaths = [];

      for (const workspacePath of workspacePaths) {
        const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');

        if (fs.existsSync(workspaceYmlPath)) {
          validWorkspaces.push(workspacePath);
        } else {
          invalidPaths.push(workspacePath);
        }
      }

      for (const invalidPath of invalidPaths) {
        lastOpenedWorkspaces.remove(invalidPath);
      }

      return validWorkspaces;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:rename-workspace', async (event, workspacePath, newName) => {
    try {
      await updateWorkspaceName(workspacePath, newName);
      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:close-workspace', async (event, workspacePath) => {
    try {
      lastOpenedWorkspaces.remove(workspacePath);
      globalEnvironmentsStore.removeActiveGlobalEnvironmentUidForWorkspace(workspacePath);

      if (workspaceWatcher) {
        workspaceWatcher.removeWatcher(workspacePath);
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:export-workspace', async (event, workspacePath, workspaceName) => {
    try {
      if (!workspacePath || !fs.existsSync(workspacePath)) {
        throw new Error('Workspace path does not exist');
      }

      const defaultFileName = `${sanitizeName(workspaceName)}.zip`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Workspace',
        defaultPath: defaultFileName,
        filters: [{ name: 'Zip Files', extensions: ['zip'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const ignoredDirectories = ['node_modules', '.git'];

      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          resolve();
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        const addDirectoryToArchive = (dirPath, archivePath) => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const entryArchivePath = archivePath ? path.join(archivePath, entry.name) : entry.name;

            if (entry.isDirectory()) {
              if (!ignoredDirectories.includes(entry.name)) {
                addDirectoryToArchive(fullPath, entryArchivePath);
              }
            } else {
              archive.file(fullPath, { name: entryArchivePath });
            }
          }
        };

        addDirectoryToArchive(workspacePath, '');
        archive.finalize();
      });

      return { success: true, filePath };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:import-workspace', async (event, zipFilePath, extractLocation) => {
    try {
      if (!zipFilePath || !fs.existsSync(zipFilePath)) {
        throw new Error('Zip file does not exist');
      }

      if (!extractLocation || !fs.existsSync(extractLocation)) {
        throw new Error('Extract location does not exist');
      }

      const tempDir = path.join(extractLocation, `_bruno_temp_${Date.now()}`);
      await fsExtra.ensureDir(tempDir);

      try {
        await extractZip(zipFilePath, { dir: tempDir });

        const extractedItems = fs.readdirSync(tempDir);
        let workspaceDir = tempDir;

        if (extractedItems.length === 1) {
          const singleItem = path.join(tempDir, extractedItems[0]);
          if (fs.statSync(singleItem).isDirectory()) {
            workspaceDir = singleItem;
          }
        }

        const workspaceYmlPath = path.join(workspaceDir, 'workspace.yml');
        if (!fs.existsSync(workspaceYmlPath)) {
          throw new Error('Invalid workspace: workspace.yml not found in the zip file');
        }

        const workspaceConfig = yaml.load(fs.readFileSync(workspaceYmlPath, 'utf8'));
        const workspaceName = workspaceConfig.info.name || 'Imported Workspace';
        const sanitizedName = sanitizeName(workspaceName);

        let finalWorkspacePath = path.join(extractLocation, sanitizedName);
        let counter = 1;
        while (fs.existsSync(finalWorkspacePath)) {
          finalWorkspacePath = path.join(extractLocation, `${sanitizedName} (${counter})`);
          counter++;
        }

        if (workspaceDir !== tempDir) {
          await fsExtra.move(workspaceDir, finalWorkspacePath);
          await fsExtra.remove(tempDir);
        } else {
          await fsExtra.move(tempDir, finalWorkspacePath);
        }

        validateWorkspacePath(finalWorkspacePath);

        const finalConfig = readWorkspaceConfig(finalWorkspacePath);
        validateWorkspaceConfig(finalConfig);

        const workspaceUid = getWorkspaceUid(finalWorkspacePath);
        const isDefault = workspaceUid === 'default';
        const configForClient = prepareWorkspaceConfigForClient(finalConfig, finalWorkspacePath, isDefault);

        lastOpenedWorkspaces.add(finalWorkspacePath);

        mainWindow.webContents.send('main:workspace-opened', finalWorkspacePath, workspaceUid, configForClient);

        if (workspaceWatcher) {
          workspaceWatcher.addWatcher(mainWindow, finalWorkspacePath);
        }

        return {
          success: true,
          workspaceConfig: configForClient,
          workspaceUid,
          workspacePath: finalWorkspacePath
        };
      } catch (error) {
        await fsExtra.remove(tempDir).catch(() => {});
        throw error;
      }
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:scan-postman-backup-folder', async (event, folderPath) => {
    try {
      if (!folderPath || !fs.existsSync(folderPath)) {
        throw new Error('Folder does not exist');
      }

      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      const workspaces = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const workspaceDir = path.join(folderPath, entry.name);
        const collectionsDir = path.join(workspaceDir, 'collections');
        const environmentsDir = path.join(workspaceDir, 'environments');

        // A valid Postman workspace folder has at least a collections/ subfolder
        // or JSON files at root level
        const hasCollectionsDir = fs.existsSync(collectionsDir) && fs.statSync(collectionsDir).isDirectory();
        const hasEnvironmentsDir = fs.existsSync(environmentsDir) && fs.statSync(environmentsDir).isDirectory();

        let collectionCount = 0;
        let environmentCount = 0;

        if (hasCollectionsDir) {
          collectionCount = fs.readdirSync(collectionsDir).filter((f) => f.endsWith('.json')).length;
        }

        if (hasEnvironmentsDir) {
          environmentCount = fs.readdirSync(environmentsDir).filter((f) => f.endsWith('.json')).length;
        }

        if (collectionCount > 0 || environmentCount > 0) {
          workspaces.push({
            name: entry.name,
            folderName: entry.name,
            collectionCount,
            environmentCount
          });
        }
      }

      return { workspaces };
    } catch (err) {
      console.error('Error scanning Postman backup folder:', err);
      throw err;
    }
  });

  ipcMain.handle('renderer:import-postman-workspaces',
    async (event, sourceFolderPath, targetLocation, selectedWorkspaces) => {
      try {
        if (!sourceFolderPath || !fs.existsSync(sourceFolderPath)) {
          throw new Error('Source folder does not exist');
        }
        if (!targetLocation || !fs.existsSync(targetLocation)) {
          throw new Error('Target location does not exist');
        }

        const results = [];

        for (const ws of selectedWorkspaces) {
          const wsSourceDir = path.join(sourceFolderPath, ws.folderName);

          try {
            mainWindow.webContents.send('main:postman-workspace-import-progress', {
              workspace: ws.name,
              status: 'converting'
            });

            // Convert collections
            const collectionsDir = path.join(wsSourceDir, 'collections');
            const collections = [];
            const errors = [];

            if (fs.existsSync(collectionsDir)) {
              const collFiles = fs.readdirSync(collectionsDir).filter((f) => f.endsWith('.json'));
              for (const file of collFiles) {
                try {
                  let rawJson = JSON.parse(fs.readFileSync(path.join(collectionsDir, file), 'utf8'));
                  // Unwrap if nested inside { collection: { ... } }
                  if (rawJson.collection && rawJson.collection.info) {
                    rawJson = rawJson.collection;
                  }
                  const brunoCollection = await postmanToBruno(rawJson, { useWorkers: false });
                  collections.push(brunoCollection);
                } catch (err) {
                  errors.push({ file, error: err.message });
                }
              }
            }

            // Convert environments
            const environmentsDir = path.join(wsSourceDir, 'environments');
            const environments = [];

            if (fs.existsSync(environmentsDir)) {
              const envFiles = fs.readdirSync(environmentsDir).filter((f) => f.endsWith('.json'));
              for (const file of envFiles) {
                try {
                  let rawJson = JSON.parse(fs.readFileSync(path.join(environmentsDir, file), 'utf8'));
                  // Unwrap if nested inside { environment: { ... } }
                  if (rawJson.environment && rawJson.environment.name) {
                    rawJson = rawJson.environment;
                  }
                  const brunoEnv = postmanToBrunoEnvironment(rawJson);
                  brunoEnv.uid = brunoEnv.uid || rawJson.id || path.basename(file, '.json');
                  environments.push(brunoEnv);
                } catch (err) {
                  errors.push({ file, error: err.message });
                }
              }
            }

            mainWindow.webContents.send('main:postman-workspace-import-progress', {
              workspace: ws.name,
              status: 'creating'
            });

            // Create Bruno workspace — skip if already exists
            const workspaceFolderName = sanitizeName(ws.name);
            const workspaceDirPath = path.join(targetLocation, workspaceFolderName);

            if (fs.existsSync(workspaceDirPath)) {
              results.push({
                workspace: ws.name,
                status: 'skipped',
                reason: 'Workspace already exists'
              });

              mainWindow.webContents.send('main:postman-workspace-import-progress', {
                workspace: ws.name,
                status: 'skipped'
              });
              continue;
            }

            await createDirectory(workspaceDirPath);
            await createDirectory(path.join(workspaceDirPath, 'collections'));

            const workspaceConfig = createWorkspaceConfig(ws.name);
            await writeWorkspaceConfig(workspaceDirPath, workspaceConfig);
            await writeFile(path.join(workspaceDirPath, '.gitignore'), DEFAULT_GITIGNORE);

            // Import collections into workspace
            const collectionPaths = [];
            const filestore = require('@usebruno/filestore');
            const stringifyRequestViaWorker = filestore.stringifyRequestViaWorker;
            const stringifyFolder = filestore.stringifyFolder;
            const stringifyEnvironment = filestore.stringifyEnvironment;
            const COLLECTION_FORMAT = filestore.DEFAULT_COLLECTION_FORMAT;

            const collectionsBasePath = path.join(workspaceDirPath, 'collections');

            for (const coll of collections) {
              try {
                const collName = sanitizeName(coll.name);
                let collPath = path.join(collectionsBasePath, collName);
                let nameCounter = 1;
                while (fs.existsSync(collPath)) {
                  collPath = path.join(collectionsBasePath, `${collName} (${nameCounter})`);
                  nameCounter++;
                }

                fs.mkdirSync(collPath, { recursive: true });

                // Write collection config
                const format = COLLECTION_FORMAT;
                if (format === 'yml') {
                  const ocConfig = yaml.dump({
                    info: { name: coll.name, version: '1' }
                  });
                  fs.writeFileSync(path.join(collPath, 'opencollection.yml'), ocConfig);
                } else {
                  const brunoConfig = {
                    version: '1',
                    name: coll.name,
                    type: 'collection'
                  };
                  fs.writeFileSync(path.join(collPath, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));
                }

                // Write environments
                if (coll.environments && coll.environments.length > 0) {
                  const envDir = path.join(collPath, 'environments');
                  fs.mkdirSync(envDir, { recursive: true });
                  for (const env of coll.environments) {
                    const envContent = await stringifyEnvironment(env);
                    const envFileName = `${sanitizeName(env.name)}.${format}`;
                    safeWriteFileSync(path.join(envDir, envFileName), envContent);
                  }
                }

                // Write requests recursively
                const writeItems = async (items = [], currentPath) => {
                  for (const item of items) {
                    if (['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type)) {
                      try {
                        const fileName = sanitizeName(item.filename || `${item.name}.${format}`);
                        const content = await stringifyRequestViaWorker(item, { format });
                        safeWriteFileSync(path.join(currentPath, fileName), content);
                      } catch (writeErr) {
                        console.error(`Failed to write request "${item.name}":`, writeErr.message);
                      }
                    }
                    if (item.type === 'folder') {
                      const folderName = sanitizeName(item.filename || item.name);
                      const folderPath = path.join(currentPath, folderName);
                      fs.mkdirSync(folderPath, { recursive: true });

                      if (item.root?.meta?.name) {
                        item.root.meta.seq = item.seq;
                        const folderContent = await stringifyFolder(item.root, { format });
                        safeWriteFileSync(path.join(folderPath, `folder.${format}`), folderContent);
                      }

                      if (item.items && item.items.length) {
                        await writeItems(item.items, folderPath);
                      }
                    }
                  }
                };

                await writeItems(coll.items, collPath);
                collectionPaths.push({ path: collPath, name: coll.name });
              } catch (err) {
                errors.push({ file: coll.name, error: err.message });
              }
            }

            // Add collections to workspace config
            for (const collInfo of collectionPaths) {
              await addCollectionToWorkspace(workspaceDirPath, { path: collInfo.path, name: collInfo.name });
            }

            // Import environments as workspace-level environments
            if (environments.length > 0) {
              const importedEnvNames = new Set();
              for (const env of environments) {
                try {
                  // Skip duplicate environment names
                  if (importedEnvNames.has(env.name)) {
                    continue;
                  }
                  await globalEnvironmentsManager.createGlobalEnvironment(workspaceDirPath, {
                    name: env.name,
                    variables: env.variables || []
                  });
                  importedEnvNames.add(env.name);
                } catch (err) {
                  errors.push({ file: env.name, error: err.message });
                }
              }
            }

            // Open the workspace
            const workspaceUid = getWorkspaceUid(workspaceDirPath);
            const isDefault = workspaceUid === 'default';
            const finalConfig = readWorkspaceConfig(workspaceDirPath);
            const configForClient = prepareWorkspaceConfigForClient(finalConfig, workspaceDirPath, isDefault);

            lastOpenedWorkspaces.add(workspaceDirPath);
            mainWindow.webContents.send('main:workspace-opened', workspaceDirPath, workspaceUid, configForClient);

            if (workspaceWatcher) {
              workspaceWatcher.addWatcher(mainWindow, workspaceDirPath);
            }

            results.push({
              workspace: ws.name,
              status: 'success',
              collections: collectionPaths.length,
              environments: environments.length,
              errors
            });

            mainWindow.webContents.send('main:postman-workspace-import-progress', {
              workspace: ws.name,
              status: 'success',
              collections: collectionPaths.length,
              environments: environments.length
            });
          } catch (err) {
            results.push({
              workspace: ws.name,
              status: 'error',
              error: err.message
            });

            mainWindow.webContents.send('main:postman-workspace-import-progress', {
              workspace: ws.name,
              status: 'error',
              error: err.message
            });
          }
        }

        return { results };
      } catch (err) {
        console.error('Error importing Postman workspaces:', err);
        throw err;
      }
    });

  ipcMain.handle('renderer:save-workspace-docs', async (event, workspacePath, docs) => {
    try {
      return await updateWorkspaceDocs(workspacePath, docs);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:load-workspace-environments', async (event, workspacePath) => {
    try {
      const result = await globalEnvironmentsManager.getGlobalEnvironments(workspacePath);
      return result.globalEnvironments;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:create-workspace-environment', async (event, workspacePath, environmentName) => {
    try {
      return await globalEnvironmentsManager.createGlobalEnvironment(workspacePath, {
        name: environmentName,
        variables: []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:delete-workspace-environment', async (event, workspacePath, environmentUid) => {
    try {
      return await globalEnvironmentsManager.deleteGlobalEnvironment(workspacePath, { environmentUid });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:import-workspace-environment', async (event, workspacePath, environmentData) => {
    try {
      return await globalEnvironmentsManager.createGlobalEnvironment(workspacePath, {
        name: environmentData.name || 'Imported Environment',
        variables: environmentData.variables || []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:update-workspace-environment', async (event, workspacePath, environmentUid, environmentData) => {
    try {
      return await globalEnvironmentsManager.saveGlobalEnvironment(workspacePath, {
        environmentUid,
        variables: environmentData.variables || []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:rename-workspace-environment', async (event, workspacePath, environmentUid, newName) => {
    try {
      return await globalEnvironmentsManager.renameGlobalEnvironment(workspacePath, {
        environmentUid,
        name: newName
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:copy-workspace-environment', async (event, workspacePath, environmentUid, newName) => {
    try {
      const result = await globalEnvironmentsManager.getGlobalEnvironments(workspacePath);
      const sourceEnv = result.globalEnvironments.find((env) => env.uid === environmentUid);

      if (!sourceEnv) {
        throw new Error('Source environment not found');
      }

      // Create new environment with copied variables
      return await globalEnvironmentsManager.createGlobalEnvironment(workspacePath, {
        name: newName,
        variables: sourceEnv.variables || []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:add-collection-to-workspace', async (event, workspacePath, collection) => {
    try {
      const normalizedCollection = normalizeCollectionEntry(workspacePath, collection);
      const updatedCollections = await addCollectionToWorkspace(workspacePath, normalizedCollection);

      const workspaceConfig = readWorkspaceConfig(workspacePath);
      const workspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = workspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);
      mainWindow.webContents.send('main:workspace-config-updated', workspacePath, workspaceUid, configForClient);

      return updatedCollections;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:ensure-collections-folder', async (event, workspacePath) => {
    try {
      const collectionsPath = path.join(workspacePath, 'collections');
      if (!fs.existsSync(collectionsPath)) {
        await createDirectory(collectionsPath);
      }
      return collectionsPath;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:start-workspace-watcher', async (event, workspacePath) => {
    try {
      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }
      return true;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:remove-collection-from-workspace', async (event, workspaceUid, workspacePath, collectionPath, options = {}) => {
    try {
      const { deleteFiles = false } = options;
      const result = await removeCollectionFromWorkspace(workspacePath, collectionPath);

      if (deleteFiles && result.removedCollection && fs.existsSync(collectionPath)) {
        await fsExtra.remove(collectionPath);
      }

      const correctWorkspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = correctWorkspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(result.updatedConfig, workspacePath, isDefault);
      mainWindow.webContents.send('main:workspace-config-updated', workspacePath, correctWorkspaceUid, configForClient);

      return true;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:get-collection-workspaces', async (event, collectionPath) => {
    try {
      const workspacePaths = lastOpenedWorkspaces.getAll();
      const workspacesWithCollection = [];

      for (const workspacePath of workspacePaths) {
        try {
          const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
          if (fs.existsSync(workspaceYmlPath)) {
            const workspaceConfig = yaml.load(fs.readFileSync(workspaceYmlPath, 'utf8')) || {};
            const collections = workspaceConfig.collections || [];

            const hasCollection = collections.some((c) => {
              const resolvedPath = path.isAbsolute(c.path)
                ? c.path
                : path.resolve(workspacePath, c.path);
              return resolvedPath === collectionPath;
            });

            if (hasCollection) {
              workspacesWithCollection.push(workspacePath);
            }
          }
        } catch (error) {
          console.warn('Failed to check workspace collection:', error.message);
        }
      }

      return workspacesWithCollection;
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('renderer:get-default-workspace', async (event) => {
    try {
      const result = await defaultWorkspaceManager.ensureDefaultWorkspaceExists();
      if (!result) {
        return null;
      }

      const { workspacePath, workspaceUid } = result;
      const workspaceConfig = readWorkspaceConfig(workspacePath);
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, true);

      return {
        workspaceConfig: configForClient,
        workspaceUid,
        workspacePath
      };
    } catch (error) {
      console.error('Error getting default workspace:', error);
      return null;
    }
  });

  // Guard to prevent main:renderer-ready from running multiple times (only needed in dev mode due to strict mode)
  let rendererReadyProcessed = false;

  ipcMain.on('main:renderer-ready', async (win) => {
    if (isDev && rendererReadyProcessed) {
      return;
    }
    rendererReadyProcessed = true;

    try {
      let defaultWorkspacePath = null;

      const defaultResult = await defaultWorkspaceManager.ensureDefaultWorkspaceExists();
      if (defaultResult) {
        const { workspacePath, workspaceUid } = defaultResult;
        defaultWorkspacePath = workspacePath;
        const workspaceConfig = readWorkspaceConfig(workspacePath);
        const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, true);

        win.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

        if (workspaceWatcher) {
          workspaceWatcher.addWatcher(win, workspacePath);
        }
      }

      const workspacePaths = lastOpenedWorkspaces.getAll();
      const invalidPaths = [];

      for (const workspacePath of workspacePaths) {
        if (defaultWorkspacePath && workspacePath === defaultWorkspacePath) {
          continue;
        }

        const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');

        if (fs.existsSync(workspaceYmlPath)) {
          try {
            const workspaceConfig = readWorkspaceConfig(workspacePath);
            validateWorkspaceConfig(workspaceConfig);
            const workspaceUid = getWorkspaceUid(workspacePath);
            const isDefault = workspaceUid === 'default';
            const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);

            win.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

            if (workspaceWatcher) {
              workspaceWatcher.addWatcher(win, workspacePath);
            }
          } catch (error) {
            console.error(`Error loading workspace ${workspacePath}:`, error);
            invalidPaths.push(workspacePath);
          }
        } else {
          invalidPaths.push(workspacePath);
        }
      }

      for (const invalidPath of invalidPaths) {
        lastOpenedWorkspaces.remove(invalidPath);
      }
    } catch (error) {
      console.error('Error initializing workspaces:', error);
    }
  });
};

module.exports = registerWorkspaceIpc;
