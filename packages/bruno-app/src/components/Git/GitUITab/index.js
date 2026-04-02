import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconPlus,
  IconArrowBackUp,
  IconGitCommit,
  IconAlertTriangle,
  IconHistory,
  IconArchive,
  IconLoader2,
  IconMinus
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
  pushChanges,
  pullChanges,
  fetchAndRefresh,
  createStashAndRefresh,
  applyStashAndRefresh,
  dropStashAndRefresh,
  abortConflict,
  continueMergeAndRefresh,
  loadStagedDiff,
  loadUnstagedDiff,
  setGitActiveTab,
  setActiveDiff
} from 'providers/ReduxStore/slices/git';
import { uuid } from 'utils/common';
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
    currentBranch = null,
    status = { staged: [], unstaged: [], conflicted: [] },
    logs = [],
    stashes = [],
    activeDiff = null,
    isLoading = false
  } = gitState;

  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [stashMessage, setStashMessage] = useState('');

  // Conflict resolution state
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [conflictFiles, setConflictFiles] = useState([]);
  const [activeConflictIndex, setActiveConflictIndex] = useState(0);
  const [mergeCommitMessage, setMergeCommitMessage] = useState('Merge conflict resolution');

  useEffect(() => {
    if (collectionUid && collectionPath) {
      dispatch(loadGitData(collectionUid, collectionPath));
    }
  }, [collectionUid, collectionPath]);

  // Auto-refresh git status when collection files change
  useEffect(() => {
    if (!collectionUid || !collectionPath) return;
    const { ipcRenderer } = window;
    if (!ipcRenderer) return;

    const handleCollectionChanged = () => {
      dispatch(loadGitData(collectionUid, collectionPath));
    };

    const unsubscribe = ipcRenderer.on('main:collection-tree-updated', handleCollectionChanged);

    // Also poll every 5 seconds as fallback (for external git operations like merge)
    const interval = setInterval(() => {
      dispatch(loadGitData(collectionUid, collectionPath));
    }, 5000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
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

  // Conflict resolution
  const handleOpenConflictResolver = async () => {
    const files = [];
    for (const file of status.conflicted) {
      try {
        const content = await window.ipcRenderer.invoke('renderer:git-read-conflicted-file', {
          collectionPath,
          filePath: file.path
        });
        files.push({ path: file.path, content });
      } catch (err) {
        files.push({ path: file.path, content: `Error reading file: ${err.message}` });
      }
    }
    setConflictFiles(files);
    setActiveConflictIndex(0);
    setShowConflictResolver(true);
  };

  const handleResolveConflicts = () => {
    dispatch(continueMergeAndRefresh(collectionUid, collectionPath, conflictFiles, mergeCommitMessage));
    setShowConflictResolver(false);
    setConflictFiles([]);
  };

  const updateConflictFileContent = (index, newContent) => {
    setConflictFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], content: newContent };
      return updated;
    });
  };

  const totalChanges = (status.staged?.length || 0) + (status.unstaged?.length || 0);

  const renderChanges = () => (
    <div>
      {/* Conflict banner */}
      {status.conflicted?.length > 0 && (
        <div className="conflict-banner">
          <span>
            <IconAlertTriangle size={14} strokeWidth={1.5} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {status.conflicted.length} conflicted file(s) — resolve before committing
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="icon-btn"
              onClick={handleOpenConflictResolver}
              style={{ width: 'auto', padding: '2px 8px', fontSize: '11px', opacity: 1, border: '1px solid rgba(248, 81, 73, 0.3)', borderRadius: 4 }}
            >
              Resolve
            </button>
            <button
              className="icon-btn danger"
              onClick={() => dispatch(abortConflict(collectionUid, collectionPath))}
              style={{ width: 'auto', padding: '2px 8px', fontSize: '11px' }}
            >
              Abort merge
            </button>
          </div>
        </div>
      )}

      <div className="changes-hint">
        Stage all the changes to commit.
      </div>

      {/* Commit button */}
      <button
        className="commit-btn"
        disabled={status.staged?.length === 0 || isLoading}
        onClick={() => setShowCommitModal(true)}
      >
        {isLoading && <IconLoader2 size={14} strokeWidth={1.5} className="animate-spin" />}
        Commit Changes
      </button>

      {/* Staged section */}
      {status.staged?.length > 0 && (
        <>
          <div className="changes-header">
            <span className="changes-title">Staged ({status.staged.length})</span>
            <div className="changes-actions">
              <button className="icon-btn" onClick={handleUnstageAll} title="Unstage all">
                <IconMinus size={16} strokeWidth={1.5} />
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
                  <IconMinus size={15} strokeWidth={1.5} />
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

      {/* Conflicted files */}
      {status.conflicted?.length > 0 && (
        <>
          <div className="changes-header" style={{ marginTop: 8 }}>
            <span className="changes-title" style={{ color: '#f85149' }}>Conflicted ({status.conflicted.length})</span>
          </div>
          {status.conflicted.map((file) => (
            <div key={`conflict-${file.path}`} className="file-row">
              <div className="file-info">
                <span className="file-name" title={file.path}>{getFileName(file.path)}</span>
              </div>
              <div className="file-actions">
                <span className="file-status-badge C">C</span>
              </div>
            </div>
          ))}
        </>
      )}

      {totalChanges === 0 && status.conflicted?.length === 0 && (
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
      {/* Loading indicator */}
      {isLoading && (
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, borderBottom: '1px solid var(--color-sidebar-border, #333)' }}>
          <IconLoader2 size={14} strokeWidth={1.5} className="animate-spin" />
          <span style={{ opacity: 0.6 }}>Processing...</span>
        </div>
      )}

      {/* Sub-tabs */}
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

      {/* Conflict Resolution Modal */}
      {showConflictResolver && conflictFiles.length > 0 && (
        <Modal
          size="lg"
          title={`Resolve Conflicts (${activeConflictIndex + 1}/${conflictFiles.length})`}
          handleConfirm={handleResolveConflicts}
          handleCancel={() => setShowConflictResolver(false)}
          confirmText="Resolve & Continue Merge"
          confirmDisabled={conflictFiles.some((f) => f.content.includes('<<<<<<<') || f.content.includes('>>>>>>>'))}
        >
          <div className="flex flex-col" style={{ minHeight: 400 }}>
            {/* File tabs */}
            {conflictFiles.length > 1 && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 8px 0', flexWrap: 'wrap' }}>
                {conflictFiles.map((file, i) => (
                  <button
                    key={file.path}
                    onClick={() => setActiveConflictIndex(i)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      border: '1px solid rgba(128,128,128,0.3)',
                      borderRadius: 4,
                      background: i === activeConflictIndex ? 'rgba(128,128,128,0.15)' : 'transparent',
                      cursor: 'pointer',
                      color: 'inherit',
                      fontWeight: i === activeConflictIndex ? 600 : 400
                    }}
                  >
                    {getFileName(file.path)}
                    {(file.content.includes('<<<<<<<') || file.content.includes('>>>>>>>')) && (
                      <IconAlertTriangle size={10} strokeWidth={1.5} style={{ display: 'inline', marginLeft: 4, color: '#f85149', verticalAlign: 'middle' }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* File path */}
            <div style={{ padding: '8px 12px', fontSize: 11, opacity: 0.5 }}>
              {conflictFiles[activeConflictIndex]?.path}
            </div>

            {/* Editor hint with color legend */}
            <div style={{ padding: '0 12px 8px', fontSize: 11, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ color: '#d29922' }}>Edit the file below — remove conflict markers and keep the content you want:</span>
            </div>
            <div style={{ padding: '0 12px 8px', fontSize: 10, display: 'flex', gap: 12 }}>
              <span><span style={{ color: '#2ea043', fontWeight: 600 }}>&#9632;</span> Current (HEAD)</span>
              <span><span style={{ color: '#d29922', fontWeight: 600 }}>&#9632;</span> Separator</span>
              <span><span style={{ color: '#58a6ff', fontWeight: 600 }}>&#9632;</span> Incoming</span>
            </div>

            {/* Conflict editor with syntax highlighting */}
            <div style={{ flex: 1, margin: '0 12px 8px', position: 'relative', minHeight: 300 }}>
              {/* Highlighted preview (read-only visual layer) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 8,
                  fontFamily: 'SF Mono, Monaco, Menlo, Courier New, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  border: '1px solid rgba(128,128,128,0.3)',
                  borderRadius: 4,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              >
                {(() => {
                  const lines = (conflictFiles[activeConflictIndex]?.content || '').split('\n');
                  let section = 'none'; // 'none' | 'ours' | 'theirs'
                  return lines.map((line, i) => {
                    let bg = 'transparent';
                    let color = 'inherit';
                    let fontWeight = 'normal';

                    if (line.startsWith('<<<<<<<')) {
                      section = 'ours';
                      bg = 'rgba(46, 160, 67, 0.2)';
                      color = '#2ea043';
                      fontWeight = 600;
                    } else if (line.startsWith('=======')) {
                      section = 'theirs';
                      bg = 'rgba(210, 153, 34, 0.2)';
                      color = '#d29922';
                      fontWeight = 600;
                    } else if (line.startsWith('>>>>>>>')) {
                      section = 'none';
                      bg = 'rgba(88, 166, 255, 0.2)';
                      color = '#58a6ff';
                      fontWeight = 600;
                    } else if (section === 'ours') {
                      bg = 'rgba(46, 160, 67, 0.08)';
                    } else if (section === 'theirs') {
                      bg = 'rgba(88, 166, 255, 0.08)';
                    }

                    return (
                      <div key={i} style={{ background: bg, color, fontWeight, margin: '0 -8px', padding: '0 8px' }}>
                        {line || '\u00A0'}
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Actual editable textarea (transparent text, captures input) */}
              <textarea
                value={conflictFiles[activeConflictIndex]?.content || ''}
                onChange={(e) => updateConflictFileContent(activeConflictIndex, e.target.value)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 8,
                  fontFamily: 'SF Mono, Monaco, Menlo, Courier New, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  border: '1px solid transparent',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'transparent',
                  caretColor: 'inherit',
                  resize: 'none',
                  zIndex: 2,
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>

            {/* Merge commit message */}
            <div style={{ padding: '0 12px 8px' }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Merge Commit Message</label>
              <input
                type="text"
                className="block textbox w-full"
                value={mergeCommitMessage}
                onChange={(e) => setMergeCommitMessage(e.target.value)}
                style={{ fontSize: 12 }}
              />
            </div>
          </div>
        </Modal>
      )}
    </StyledWrapper>
  );
};

export default GitUITab;
