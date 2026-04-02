import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconX,
  IconGitBranch,
  IconArrowUp,
  IconArrowDown,
  IconRefresh,
  IconPlus,
  IconLoader2,
  IconGitCommit,
  IconArchive,
  IconHistory,
  IconAlertTriangle,
  IconTrash
} from '@tabler/icons';
import {
  loadGitData,
  loadGitStatus,
  loadGitLogs,
  loadGitStashes,
  stageFiles,
  unstageFiles,
  discardFiles,
  commitAndRefresh,
  pushChanges,
  pullChanges,
  fetchAndRefresh,
  switchBranch,
  createStashAndRefresh,
  applyStashAndRefresh,
  dropStashAndRefresh,
  abortConflict,
  loadStagedDiff,
  loadUnstagedDiff,
  setGitActiveTab,
  setCommitMessage,
  setActiveDiff,
  setGitPanelOpen
} from 'providers/ReduxStore/slices/git';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const getStatusClass = (file) => {
  if (file.fileIndex === 'A' || file.working_dir === '?') return 'added';
  if (file.fileIndex === 'M' || file.working_dir === 'M') return 'modified';
  if (file.fileIndex === 'D') return 'deleted';
  if (file.fileIndex === 'R') return 'renamed';
  if (file.fileIndex === 'U' || file.working_dir === 'U') return 'conflicted';
  return 'untracked';
};

const getStatusLabel = (file) => {
  if (file.fileIndex === 'A' || file.working_dir === '?') return 'A';
  if (file.fileIndex === 'M' || file.working_dir === 'M') return 'M';
  if (file.fileIndex === 'D') return 'D';
  if (file.fileIndex === 'R') return 'R';
  if (file.fileIndex === 'U' || file.working_dir === 'U') return 'C';
  return '?';
};

const getFileName = (filePath) => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

const GitPanel = ({ collectionUid, collectionPath, onClose }) => {
  const dispatch = useDispatch();
  const gitState = useSelector((state) => state.git.collections[collectionUid]) || {};
  const {
    isLoading = false,
    activeTab = 'changes',
    currentBranch = null,
    branches = [],
    status = { staged: [], unstaged: [], conflicted: [], totalFiles: 0 },
    aheadBehind = { ahead: 0, behind: 0 },
    logs = [],
    stashes = [],
    activeDiff = null,
    commitMessage = '',
    error = null
  } = gitState;

  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [stashMessage, setStashMessage] = useState('');

  useEffect(() => {
    dispatch(loadGitData(collectionUid, collectionPath));
  }, [collectionUid, collectionPath]);

  useEffect(() => {
    if (activeTab === 'log') {
      dispatch(loadGitLogs(collectionUid, collectionPath));
    }
    if (activeTab === 'stash') {
      dispatch(loadGitStashes(collectionUid, collectionPath));
    }
  }, [activeTab]);

  const handleStageAll = () => {
    const files = status.unstaged.map((f) => f.path);
    if (files.length > 0) {
      dispatch(stageFiles(collectionUid, collectionPath, files));
    }
  };

  const handleUnstageAll = () => {
    const files = status.staged.map((f) => f.path);
    if (files.length > 0) {
      dispatch(unstageFiles(collectionUid, collectionPath, files));
    }
  };

  const handleStageFile = (filePath) => {
    dispatch(stageFiles(collectionUid, collectionPath, [filePath]));
  };

  const handleUnstageFile = (filePath) => {
    dispatch(unstageFiles(collectionUid, collectionPath, [filePath]));
  };

  const handleDiscardFile = (filePath) => {
    dispatch(discardFiles(collectionUid, collectionPath, [filePath]));
  };

  const handleCommit = () => {
    if (commitMessage.trim() && status.staged.length > 0) {
      dispatch(commitAndRefresh(collectionUid, collectionPath, commitMessage.trim()));
    }
  };

  const handlePush = () => {
    const processUid = uuid();
    dispatch(pushChanges(collectionUid, collectionPath, 'origin', currentBranch, processUid));
  };

  const handlePull = () => {
    const processUid = uuid();
    dispatch(pullChanges(collectionUid, collectionPath, 'origin', currentBranch, '--no-rebase', processUid));
  };

  const handleFetch = () => {
    dispatch(fetchAndRefresh(collectionUid, collectionPath));
  };

  const handleSwitchBranch = (branchName) => {
    const processUid = uuid();
    dispatch(switchBranch(collectionUid, collectionPath, branchName, false, processUid));
    setShowBranchDropdown(false);
  };

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      const processUid = uuid();
      dispatch(switchBranch(collectionUid, collectionPath, newBranchName.trim(), true, processUid));
      setNewBranchName('');
      setShowNewBranch(false);
      setShowBranchDropdown(false);
    }
  };

  const handleCreateStash = () => {
    dispatch(createStashAndRefresh(collectionUid, collectionPath, stashMessage || undefined));
    setStashMessage('');
  };

  const handleFileDiffClick = (file, type) => {
    if (type === 'staged') {
      dispatch(loadStagedDiff(collectionUid, collectionPath, file.path));
    } else {
      dispatch(loadUnstagedDiff(collectionUid, collectionPath, file.path));
    }
  };

  const handleCloseDiff = () => {
    dispatch(setActiveDiff({ collectionUid, diff: null }));
  };

  const handleRefresh = () => {
    dispatch(loadGitData(collectionUid, collectionPath));
  };

  const renderDiffPanel = () => {
    if (!activeDiff) return null;

    const lines = (activeDiff.diff || '').split('\n');

    return (
      <div className="diff-panel">
        <div className="diff-header">
          <span>{getFileName(activeDiff.filePath)} ({activeDiff.type})</span>
          <button onClick={handleCloseDiff} className="git-action-btn" style={{ border: 'none', padding: '2px' }}>
            <IconX size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="diff-content">
          {lines.map((line, i) => {
            let cls = '';
            if (line.startsWith('+') && !line.startsWith('+++')) cls = 'added';
            else if (line.startsWith('-') && !line.startsWith('---')) cls = 'removed';
            else if (line.startsWith('@@')) cls = 'header';
            return (
              <div key={i} className={`diff-line ${cls}`}>
                {line}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChangesTab = () => (
    <div className="flex flex-col h-full">
      {status.conflicted?.length > 0 && (
        <div className="conflict-banner">
          <span>
            <IconAlertTriangle size={14} strokeWidth={1.5} style={{ display: 'inline', marginRight: 4 }} />
            {status.conflicted.length} conflicted file(s)
          </span>
          <button
            className="git-action-btn"
            style={{ border: 'none', fontSize: '11px', color: '#f85149' }}
            onClick={() => dispatch(abortConflict(collectionUid, collectionPath))}
          >
            Abort merge
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Staged files */}
        <div className="section-header">
          <span>Staged ({status.staged?.length || 0})</span>
          {status.staged?.length > 0 && (
            <button
              className="git-action-btn"
              style={{ border: 'none', padding: '2px 4px', fontSize: '10px' }}
              onClick={handleUnstageAll}
            >
              Unstage all
            </button>
          )}
        </div>
        {status.staged?.map((file) => (
          <div
            key={`staged-${file.path}`}
            className="file-entry"
            onClick={() => handleFileDiffClick(file, 'staged')}
          >
            <span className={`file-status ${getStatusClass(file)}`}>{getStatusLabel(file)}</span>
            <span className="file-name" title={file.path}>{file.path}</span>
            <div className="file-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation(); handleUnstageFile(file.path);
                }}
                title="Unstage"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 2px' }}
              >
                <IconArrowDown size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}

        {/* Unstaged files */}
        <div className="section-header" style={{ marginTop: 8 }}>
          <span>Changes ({status.unstaged?.length || 0})</span>
          {status.unstaged?.length > 0 && (
            <button
              className="git-action-btn"
              style={{ border: 'none', padding: '2px 4px', fontSize: '10px' }}
              onClick={handleStageAll}
            >
              Stage all
            </button>
          )}
        </div>
        {status.unstaged?.map((file) => (
          <div
            key={`unstaged-${file.path}`}
            className="file-entry"
            onClick={() => handleFileDiffClick(file, 'unstaged')}
          >
            <span className={`file-status ${getStatusClass(file)}`}>{getStatusLabel(file)}</span>
            <span className="file-name" title={file.path}>{file.path}</span>
            <div className="file-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation(); handleStageFile(file.path);
                }}
                title="Stage"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 2px' }}
              >
                <IconPlus size={14} strokeWidth={1.5} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); handleDiscardFile(file.path);
                }}
                title="Discard"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f85149', padding: '0 2px' }}
              >
                <IconTrash size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}

        {/* Conflicted files */}
        {status.conflicted?.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 8 }}>
              <span>Conflicted ({status.conflicted.length})</span>
            </div>
            {status.conflicted.map((file) => (
              <div key={`conflict-${file.path}`} className="file-entry">
                <span className="file-status conflicted">C</span>
                <span className="file-name" title={file.path}>{file.path}</span>
              </div>
            ))}
          </>
        )}

        {status.staged?.length === 0 && status.unstaged?.length === 0 && status.conflicted?.length === 0 && (
          <div className="empty-state">
            <IconGitCommit size={24} strokeWidth={1.5} />
            <span style={{ marginTop: 8 }}>No changes</span>
          </div>
        )}
      </div>

      {/* Commit section */}
      <div className="commit-section">
        <textarea
          className="commit-input"
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => dispatch(setCommitMessage({ collectionUid, message: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleCommit();
            }
          }}
          data-testid="git-commit-input"
        />
        <button
          className="commit-btn"
          disabled={!commitMessage.trim() || status.staged?.length === 0 || isLoading}
          onClick={handleCommit}
          data-testid="git-commit-btn"
        >
          {isLoading ? 'Committing...' : `Commit (${status.staged?.length || 0} file${status.staged?.length !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );

  const renderLogTab = () => (
    <div className="flex-1 overflow-y-auto">
      {logs.length === 0 && (
        <div className="empty-state">
          <IconHistory size={24} strokeWidth={1.5} />
          <span style={{ marginTop: 8 }}>No commits yet</span>
        </div>
      )}
      {logs.map((log) => (
        <div key={log.hash} className="log-entry">
          <div className="log-message">{log.message}</div>
          <div className="log-meta">
            <span>{log.author_name}</span>
            <span>{log.hash?.substring(0, 7)}</span>
            <span>{log.date}</span>
            {log.insertions !== undefined && (
              <span style={{ color: '#2ea043' }}>+{log.insertions}</span>
            )}
            {log.deletions !== undefined && (
              <span style={{ color: '#f85149' }}>-{log.deletions}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStashTab = () => (
    <div className="flex flex-col h-full">
      <div style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
        <input
          type="text"
          placeholder="Stash message (optional)"
          value={stashMessage}
          onChange={(e) => setStashMessage(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '12px',
            border: '1px solid var(--color-sidebar-border, #333)',
            borderRadius: '4px',
            background: 'transparent',
            color: 'inherit'
          }}
        />
        <button
          className="git-action-btn"
          onClick={handleCreateStash}
          disabled={status.staged?.length === 0 && status.unstaged?.length === 0}
        >
          <IconArchive size={14} strokeWidth={1.5} />
          Stash
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {stashes.length === 0 && (
          <div className="empty-state">
            <IconArchive size={24} strokeWidth={1.5} />
            <span style={{ marginTop: 8 }}>No stashes</span>
          </div>
        )}
        {stashes.map((stash, index) => (
          <div key={index} className="stash-entry">
            <span className="stash-message" title={stash.message}>
              {stash.message || `stash@{${stash.index}}`}
            </span>
            <div className="stash-actions">
              <button
                className="git-action-btn"
                style={{ border: 'none', padding: '2px 4px', fontSize: '10px' }}
                onClick={() => dispatch(applyStashAndRefresh(collectionUid, collectionPath, stash.index))}
                title="Apply stash"
              >
                Apply
              </button>
              <button
                className="git-action-btn"
                style={{ border: 'none', padding: '2px 4px', fontSize: '10px', color: '#f85149' }}
                onClick={() => dispatch(dropStashAndRefresh(collectionUid, collectionPath, stash.index))}
                title="Drop stash"
              >
                Drop
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="git-panel-overlay" onClick={onClose} />
      <StyledWrapper data-testid="git-panel">
        {/* Header */}
        <div className="git-panel-header">
          <div
            className="branch-name"
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            data-testid="git-branch-selector"
          >
            <IconGitBranch size={16} strokeWidth={1.5} />
            <span>{currentBranch || 'detached'}</span>
          </div>
          <div className="header-actions">
            {isLoading && <IconLoader2 size={14} strokeWidth={1.5} className="animate-spin" />}
            <button onClick={handleRefresh} className="git-action-btn" style={{ border: 'none' }} title="Refresh">
              <IconRefresh size={14} strokeWidth={1.5} />
            </button>
            <button onClick={onClose} className="git-action-btn" style={{ border: 'none' }} title="Close">
              <IconX size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Branch dropdown */}
        {showBranchDropdown && (
          <div style={{ borderBottom: '1px solid var(--color-sidebar-border, #333)' }}>
            {showNewBranch ? (
              <div style={{ padding: '6px 12px', display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  placeholder="New branch name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); }}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '12px',
                    border: '1px solid var(--color-sidebar-border, #333)',
                    borderRadius: '4px',
                    background: 'transparent',
                    color: 'inherit'
                  }}
                />
                <button className="git-action-btn" onClick={handleCreateBranch}>Create</button>
                <button className="git-action-btn" onClick={() => setShowNewBranch(false)}>
                  <IconX size={12} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div style={{ padding: '4px 12px' }}>
                <button
                  className="git-action-btn"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 4 }}
                  onClick={() => setShowNewBranch(true)}
                >
                  <IconPlus size={12} strokeWidth={1.5} /> New branch
                </button>
              </div>
            )}
            <div className="branch-list">
              {branches.map((branch) => (
                <div
                  key={branch}
                  className={`branch-item ${branch === currentBranch ? 'current' : ''}`}
                  onClick={() => branch !== currentBranch && handleSwitchBranch(branch)}
                >
                  <span>{branch}</span>
                  {branch === currentBranch && <IconGitBranch size={12} strokeWidth={1.5} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="git-action-bar">
          <button
            className="git-action-btn"
            onClick={handleFetch}
            disabled={isLoading}
            title="Fetch"
          >
            <IconRefresh size={14} strokeWidth={1.5} />
            Fetch
          </button>
          <button
            className="git-action-btn"
            onClick={handlePull}
            disabled={isLoading}
            title="Pull"
            data-testid="git-pull-btn"
          >
            <IconArrowDown size={14} strokeWidth={1.5} />
            Pull
            {aheadBehind.behind > 0 && <span className="badge">{aheadBehind.behind}</span>}
          </button>
          <button
            className="git-action-btn"
            onClick={handlePush}
            disabled={isLoading}
            title="Push"
            data-testid="git-push-btn"
          >
            <IconArrowUp size={14} strokeWidth={1.5} />
            Push
            {aheadBehind.ahead > 0 && <span className="badge">{aheadBehind.ahead}</span>}
          </button>
        </div>

        {/* Tabs */}
        <div className="git-tabs">
          <button
            className={`git-tab ${activeTab === 'changes' ? 'active' : ''}`}
            onClick={() => dispatch(setGitActiveTab({ collectionUid, tab: 'changes' }))}
          >
            Changes
            {(status.staged?.length || 0) + (status.unstaged?.length || 0) > 0 && (
              <span> ({(status.staged?.length || 0) + (status.unstaged?.length || 0)})</span>
            )}
          </button>
          <button
            className={`git-tab ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => dispatch(setGitActiveTab({ collectionUid, tab: 'log' }))}
          >
            Log
          </button>
          <button
            className={`git-tab ${activeTab === 'stash' ? 'active' : ''}`}
            onClick={() => dispatch(setGitActiveTab({ collectionUid, tab: 'stash' }))}
          >
            Stash
            {stashes.length > 0 && <span> ({stashes.length})</span>}
          </button>
        </div>

        {/* Content */}
        {activeDiff ? (
          renderDiffPanel()
        ) : (
          <div className="git-panel-content">
            {activeTab === 'changes' && renderChangesTab()}
            {activeTab === 'log' && renderLogTab()}
            {activeTab === 'stash' && renderStashTab()}
          </div>
        )}
      </StyledWrapper>
    </>
  );
};

export default GitPanel;
