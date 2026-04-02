import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconPlus,
  IconArrowBackUp,
  IconGitCommit,
  IconAlertTriangle,
  IconHistory,
  IconArchive
} from '@tabler/icons';
import Modal from 'components/Modal';
import {
  loadGitData,
  loadGitLogs,
  loadGitStashes,
  stageFiles,
  unstageFiles,
  discardFiles,
  commitAndRefresh,
  createStashAndRefresh,
  applyStashAndRefresh,
  dropStashAndRefresh,
  abortConflict,
  loadStagedDiff,
  loadUnstagedDiff,
  setGitActiveTab,
  setActiveDiff
} from 'providers/ReduxStore/slices/git';
import StyledWrapper from './StyledWrapper';

const getStatusLabel = (file) => {
  if (file.fileIndex === 'A' || file.working_dir === '?') return 'U';
  if (file.fileIndex === 'M' || file.working_dir === 'M') return 'M';
  if (file.fileIndex === 'D') return 'D';
  if (file.fileIndex === 'R') return 'R';
  if (file.fileIndex === 'U' || file.working_dir === 'U') return 'C';
  return '?';
};

const getFileName = (filePath) => {
  const parts = (filePath || '').split('/');
  return parts[parts.length - 1];
};

const GitUITab = ({ collection }) => {
  const dispatch = useDispatch();
  const collectionUid = collection?.uid;
  const collectionPath = collection?.pathname;

  const gitState = useSelector((state) => state.git.collections[collectionUid]) || {};
  const {
    activeTab = 'changes',
    status = { staged: [], unstaged: [], conflicted: [] },
    logs = [],
    stashes = [],
    activeDiff = null,
    isLoading = false
  } = gitState;

  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [stashMessage, setStashMessage] = useState('');

  useEffect(() => {
    if (collectionUid && collectionPath) {
      dispatch(loadGitData(collectionUid, collectionPath));
    }
  }, [collectionUid, collectionPath]);

  useEffect(() => {
    if (activeTab === 'commits') {
      dispatch(loadGitLogs(collectionUid, collectionPath));
    }
    if (activeTab === 'stash') {
      dispatch(loadGitStashes(collectionUid, collectionPath));
    }
  }, [activeTab]);

  const handleStageFile = (filePath) => {
    dispatch(stageFiles(collectionUid, collectionPath, [filePath]));
  };

  const handleStageAll = () => {
    const files = status.unstaged.map((f) => f.path);
    if (files.length > 0) dispatch(stageFiles(collectionUid, collectionPath, files));
  };

  const handleUnstageFile = (filePath) => {
    dispatch(unstageFiles(collectionUid, collectionPath, [filePath]));
  };

  const handleUnstageAll = () => {
    const files = status.staged.map((f) => f.path);
    if (files.length > 0) dispatch(unstageFiles(collectionUid, collectionPath, files));
  };

  const handleDiscardFile = (filePath) => {
    dispatch(discardFiles(collectionUid, collectionPath, [filePath]));
  };

  const handleCommit = () => {
    if (commitMessage.trim()) {
      dispatch(commitAndRefresh(collectionUid, collectionPath, commitMessage.trim()));
      setCommitMessage('');
      setShowCommitModal(false);
    }
  };

  const handleFileDiffClick = (file, type) => {
    if (type === 'staged') {
      dispatch(loadStagedDiff(collectionUid, collectionPath, file.path));
    } else {
      dispatch(loadUnstagedDiff(collectionUid, collectionPath, file.path));
    }
  };

  const totalChanges = (status.staged?.length || 0) + (status.unstaged?.length || 0);

  const renderChanges = () => (
    <div>
      {status.conflicted?.length > 0 && (
        <div className="conflict-banner">
          <span>
            <IconAlertTriangle size={14} strokeWidth={1.5} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {status.conflicted.length} conflicted file(s)
          </span>
          <button
            className="icon-btn danger"
            onClick={() => dispatch(abortConflict(collectionUid, collectionPath))}
            title="Abort merge"
            style={{ width: 'auto', padding: '2px 8px', fontSize: '11px' }}
          >
            Abort merge
          </button>
        </div>
      )}

      <div className="changes-hint">
        Stage all the changes to commit.
      </div>

      {/* Commit button */}
      <button
        className="commit-btn"
        disabled={status.staged?.length === 0}
        onClick={() => setShowCommitModal(true)}
      >
        Commit Changes
      </button>

      {/* Staged section */}
      {status.staged?.length > 0 && (
        <>
          <div className="changes-header">
            <span className="changes-title">Staged ({status.staged.length})</span>
            <div className="changes-actions">
              <button className="icon-btn" onClick={handleUnstageAll} title="Unstage all">
                <IconArrowBackUp size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {status.staged.map((file) => (
            <div key={`staged-${file.path}`} className="file-row">
              <div className="file-info">
                <span className="file-name" title={file.path}>{getFileName(file.path)}</span>
              </div>
              <div className="file-actions">
                <button className="icon-btn" onClick={() => handleUnstageFile(file.path)} title="Unstage">
                  <IconArrowBackUp size={15} strokeWidth={1.5} />
                </button>
                <span className={`file-status-badge ${getStatusLabel(file)}`}>{getStatusLabel(file)}</span>
              </div>
            </div>
          ))}
          <div className="section-divider" />
        </>
      )}

      {/* Changes (unstaged) section */}
      <div className="changes-header">
        <span className="changes-title">Changes ({status.unstaged?.length || 0})</span>
        <div className="changes-actions">
          <button className="icon-btn" onClick={handleStageAll} title="Stage all">
            <IconPlus size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {status.unstaged?.map((file) => (
        <div key={`unstaged-${file.path}`} className="file-row" onClick={() => handleFileDiffClick(file, 'unstaged')} style={{ cursor: 'pointer' }}>
          <div className="file-info">
            <span className="file-name" title={file.path}>{getFileName(file.path)}</span>
          </div>
          <div className="file-actions">
            <button
              className="icon-btn danger"
              onClick={(e) => {
                e.stopPropagation(); handleDiscardFile(file.path);
              }}
              title="Discard changes"
            >
              <IconArrowBackUp size={15} strokeWidth={1.5} />
            </button>
            <button
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation(); handleStageFile(file.path);
              }}
              title="Stage"
            >
              <IconPlus size={15} strokeWidth={1.5} />
            </button>
            <span className={`file-status-badge ${getStatusLabel(file)}`}>{getStatusLabel(file)}</span>
          </div>
        </div>
      ))}

      {totalChanges === 0 && (
        <div className="empty-state">
          <IconGitCommit size={24} strokeWidth={1.5} />
          <div style={{ marginTop: 8 }}>No changes</div>
        </div>
      )}

      {/* Diff view */}
      {activeDiff && (
        <div style={{ marginTop: 16 }}>
          <div className="changes-header">
            <span className="changes-title">{activeDiff.filePath} ({activeDiff.type})</span>
            <button className="icon-btn" onClick={() => dispatch(setActiveDiff({ collectionUid, diff: null }))}>
              &times;
            </button>
          </div>
          <pre style={{ fontSize: 11, lineHeight: 1.5, overflow: 'auto', maxHeight: 400 }}>
            {(activeDiff.diff || '').split('\n').map((line, i) => {
              let color = 'inherit';
              if (line.startsWith('+') && !line.startsWith('+++')) color = '#2ea043';
              else if (line.startsWith('-') && !line.startsWith('---')) color = '#f85149';
              else if (line.startsWith('@@')) color = '#58a6ff';
              return <div key={i} style={{ color }}>{line}</div>;
            })}
          </pre>
        </div>
      )}
    </div>
  );

  const renderCommits = () => (
    <div>
      {logs.length === 0 && (
        <div className="empty-state">
          <IconHistory size={24} strokeWidth={1.5} />
          <div style={{ marginTop: 8 }}>No commits yet</div>
        </div>
      )}
      {logs.map((log) => (
        <div key={log.hash} className="log-row">
          <div className="log-message">{log.message}</div>
          <div className="log-meta">
            <span>{log.author_name}</span>
            <span>{log.hash?.substring(0, 7)}</span>
            <span>{log.date}</span>
            {log.insertions !== undefined && <span style={{ color: '#2ea043' }}>+{log.insertions}</span>}
            {log.deletions !== undefined && <span style={{ color: '#f85149' }}>-{log.deletions}</span>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStash = () => (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Stash message (optional)"
          value={stashMessage}
          onChange={(e) => setStashMessage(e.target.value)}
          className="block textbox"
          style={{ flex: 1, fontSize: 12 }}
        />
        <button
          className="commit-btn"
          style={{ marginBottom: 0 }}
          onClick={() => {
            dispatch(createStashAndRefresh(collectionUid, collectionPath, stashMessage || undefined)); setStashMessage('');
          }}
          disabled={totalChanges === 0}
        >
          <IconArchive size={14} strokeWidth={1.5} />
          Stash
        </button>
      </div>
      {stashes.length === 0 && (
        <div className="empty-state">
          <IconArchive size={24} strokeWidth={1.5} />
          <div style={{ marginTop: 8 }}>No stashes</div>
        </div>
      )}
      {stashes.map((stash, index) => (
        <div key={index} className="stash-row">
          <span className="stash-message">{stash.message || `stash@{${stash.index}}`}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" onClick={() => dispatch(applyStashAndRefresh(collectionUid, collectionPath, stash.index))} title="Apply" style={{ width: 'auto', padding: '2px 8px', fontSize: '11px', opacity: 0.7 }}>
              Apply
            </button>
            <button className="icon-btn danger" onClick={() => dispatch(dropStashAndRefresh(collectionUid, collectionPath, stash.index))} title="Drop" style={{ width: 'auto', padding: '2px 8px', fontSize: '11px', opacity: 0.7 }}>
              Drop
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <StyledWrapper>
      {/* Sub-tabs matching Bruno Pro: Commits, Tags, Changes */}
      <div className="git-tab-header">
        <button
          className={`git-sub-tab ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => dispatch(setGitActiveTab({ collectionUid, tab: 'changes' }))}
        >
          Changes{totalChanges > 0 ? ` (${totalChanges})` : ''}
        </button>
        <button
          className={`git-sub-tab ${activeTab === 'commits' ? 'active' : ''}`}
          onClick={() => dispatch(setGitActiveTab({ collectionUid, tab: 'commits' }))}
        >
          Commits
        </button>
        <button
          className={`git-sub-tab ${activeTab === 'stash' ? 'active' : ''}`}
          onClick={() => dispatch(setGitActiveTab({ collectionUid, tab: 'stash' }))}
        >
          Stash
        </button>
      </div>

      <div className="git-tab-content">
        {activeTab === 'changes' && renderChanges()}
        {activeTab === 'commits' && renderCommits()}
        {activeTab === 'stash' && renderStash()}
      </div>

      {/* Commit Modal */}
      {showCommitModal && (
        <Modal
          size="sm"
          title="COMMIT COLLECTION CHANGES"
          handleConfirm={handleCommit}
          handleCancel={() => setShowCommitModal(false)}
          confirmText="Commit"
          confirmDisabled={!commitMessage.trim()}
        >
          <div className="flex flex-col px-2 py-2">
            <label className="font-semibold mb-2 text-sm">Commit Message</label>
            <textarea
              className="block textbox w-full"
              rows={4}
              placeholder="Enter commit message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommit(); }}
              autoFocus
              data-testid="git-commit-input"
              style={{ resize: 'vertical', fontSize: 13 }}
            />
          </div>
        </Modal>
      )}
    </StyledWrapper>
  );
};

export default GitUITab;
