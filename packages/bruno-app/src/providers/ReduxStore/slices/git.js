import { createSlice } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { uuid } from 'utils/common';

const initialCollectionGitState = {
  isLoading: false,
  isPanelOpen: false,
  activeTab: 'changes',
  gitRootPath: null,
  currentBranch: null,
  branches: [],
  remotes: [],
  status: {
    staged: [],
    unstaged: [],
    conflicted: [],
    totalFiles: 0,
    tooManyFiles: false
  },
  aheadBehind: { ahead: 0, behind: 0 },
  logs: [],
  stashes: [],
  activeDiff: null,
  commitMessage: '',
  error: null,
  autoSyncStatus: 'idle' // 'idle' | 'syncing' | 'pulling' | 'done' | 'error'
};

const gitSlice = createSlice({
  name: 'git',
  initialState: {
    collections: {}
  },
  reducers: {
    initCollectionGitState: (state, action) => {
      const { collectionUid } = action.payload;
      if (!state.collections[collectionUid]) {
        state.collections[collectionUid] = { ...initialCollectionGitState };
      }
    },
    setGitPanelOpen: (state, action) => {
      const { collectionUid, open } = action.payload;
      if (!state.collections[collectionUid]) {
        state.collections[collectionUid] = { ...initialCollectionGitState };
      }
      state.collections[collectionUid].isPanelOpen = open;
      if (!open) {
        state.collections[collectionUid].activeDiff = null;
      }
    },
    setGitActiveTab: (state, action) => {
      const { collectionUid, tab } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].activeTab = tab;
        state.collections[collectionUid].activeDiff = null;
      }
    },
    setGitRootPath: (state, action) => {
      const { collectionUid, gitRootPath } = action.payload;
      if (!state.collections[collectionUid]) {
        state.collections[collectionUid] = { ...initialCollectionGitState };
      }
      state.collections[collectionUid].gitRootPath = gitRootPath;
    },
    setGitStatus: (state, action) => {
      const { collectionUid, status } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].status = status;
      }
    },
    setGitBranches: (state, action) => {
      const { collectionUid, branches, currentBranch } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].branches = branches;
        state.collections[collectionUid].currentBranch = currentBranch;
      }
    },
    setGitRemotes: (state, action) => {
      const { collectionUid, remotes } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].remotes = remotes;
      }
    },
    setGitLogs: (state, action) => {
      const { collectionUid, logs } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].logs = logs;
      }
    },
    setGitStashes: (state, action) => {
      const { collectionUid, stashes } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].stashes = stashes;
      }
    },
    setGitAheadBehind: (state, action) => {
      const { collectionUid, ahead, behind } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].aheadBehind = { ahead, behind };
      }
    },
    setActiveDiff: (state, action) => {
      const { collectionUid, diff } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].activeDiff = diff;
      }
    },
    setCommitMessage: (state, action) => {
      const { collectionUid, message } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].commitMessage = message;
      }
    },
    setGitLoading: (state, action) => {
      const { collectionUid, isLoading } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].isLoading = isLoading;
      }
    },
    setGitError: (state, action) => {
      const { collectionUid, error } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].error = error;
      }
    },
    clearGitError: (state, action) => {
      const { collectionUid } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].error = null;
      }
    },
    setAutoSyncStatus: (state, action) => {
      const { collectionUid, status } = action.payload;
      if (state.collections[collectionUid]) {
        state.collections[collectionUid].autoSyncStatus = status;
      }
    }
  }
});

export const {
  initCollectionGitState,
  setGitPanelOpen,
  setGitActiveTab,
  setGitRootPath,
  setGitStatus,
  setGitBranches,
  setGitRemotes,
  setGitLogs,
  setGitStashes,
  setGitAheadBehind,
  setActiveDiff,
  setCommitMessage,
  setGitLoading,
  setGitError,
  clearGitError,
  setAutoSyncStatus
} = gitSlice.actions;

// ── Async Thunks ─────────────────────────────────────────────────────

const ipcInvoke = (channel, payload) => {
  return window.ipcRenderer.invoke(channel, payload);
};

export const loadGitStatus = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    const status = await ipcInvoke('renderer:git-get-status', { collectionPath });
    dispatch(setGitStatus({ collectionUid, status }));
  } catch (err) {
    console.error('Failed to load git status:', err);
  }
};

export const loadGitBranches = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    const [branches, currentBranch] = await Promise.all([
      ipcInvoke('renderer:git-get-branches', { collectionPath }),
      ipcInvoke('renderer:git-get-current-branch', { collectionPath })
    ]);
    dispatch(setGitBranches({ collectionUid, branches, currentBranch }));
  } catch (err) {
    console.error('Failed to load git branches:', err);
  }
};

export const loadGitLogs = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    const logs = await ipcInvoke('renderer:git-get-logs', { collectionPath });
    dispatch(setGitLogs({ collectionUid, logs }));
  } catch (err) {
    console.error('Failed to load git logs:', err);
  }
};

export const loadGitStashes = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    const stashes = await ipcInvoke('renderer:git-list-stashes', { collectionPath });
    dispatch(setGitStashes({ collectionUid, stashes }));
  } catch (err) {
    console.error('Failed to load git stashes:', err);
  }
};

export const loadAheadBehind = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    const result = await ipcInvoke('renderer:git-get-ahead-behind', { collectionPath });
    dispatch(setGitAheadBehind({ collectionUid, ahead: result.ahead, behind: result.behind }));
  } catch (err) {
    // Silently fail — no remote tracking branch is common
  }
};

export const loadGitData = (collectionUid, collectionPath) => async (dispatch) => {
  dispatch(setGitLoading({ collectionUid, isLoading: true }));
  try {
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadGitBranches(collectionUid, collectionPath)),
      dispatch(loadAheadBehind(collectionUid, collectionPath))
    ]);
  } finally {
    dispatch(setGitLoading({ collectionUid, isLoading: false }));
  }
};

export const stageFiles = (collectionUid, collectionPath, files) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-stage-files', { collectionPath, files });
    await dispatch(loadGitStatus(collectionUid, collectionPath));
  } catch (err) {
    toast.error(err.message || 'Failed to stage files');
  }
};

export const unstageFiles = (collectionUid, collectionPath, files) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-unstage-files', { collectionPath, files });
    await dispatch(loadGitStatus(collectionUid, collectionPath));
  } catch (err) {
    toast.error(err.message || 'Failed to unstage files');
  }
};

export const discardFiles = (collectionUid, collectionPath, files) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-discard-files', { collectionPath, files });
    await dispatch(loadGitStatus(collectionUid, collectionPath));
  } catch (err) {
    toast.error(err.message || 'Failed to discard changes');
  }
};

export const commitAndRefresh = (collectionUid, collectionPath, message) => async (dispatch) => {
  try {
    dispatch(setGitLoading({ collectionUid, isLoading: true }));
    await ipcInvoke('renderer:git-commit', { collectionPath, message });
    dispatch(setCommitMessage({ collectionUid, message: '' }));
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadGitLogs(collectionUid, collectionPath)),
      dispatch(loadAheadBehind(collectionUid, collectionPath))
    ]);
    toast.success('Changes committed');
  } catch (err) {
    toast.error(err.message || 'Commit failed');
  } finally {
    dispatch(setGitLoading({ collectionUid, isLoading: false }));
  }
};

export const pushChanges = (collectionUid, collectionPath, remote, remoteBranch, processUid) => async (dispatch) => {
  try {
    dispatch(setGitLoading({ collectionUid, isLoading: true }));
    await ipcInvoke('renderer:git-push', { collectionPath, remote, remoteBranch, processUid });
    await dispatch(loadAheadBehind(collectionUid, collectionPath));
    toast.success('Pushed successfully');
  } catch (err) {
    toast.error(err.message || 'Push failed');
  } finally {
    dispatch(setGitLoading({ collectionUid, isLoading: false }));
  }
};

export const pullChanges = (collectionUid, collectionPath, remote, remoteBranch, strategy, processUid) => async (dispatch) => {
  try {
    dispatch(setGitLoading({ collectionUid, isLoading: true }));
    await ipcInvoke('renderer:git-pull', { collectionPath, remote, remoteBranch, strategy, processUid });
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadAheadBehind(collectionUid, collectionPath))
    ]);
    toast.success('Pulled successfully');
  } catch (err) {
    // Pull failures with conflicts should still refresh status
    await dispatch(loadGitStatus(collectionUid, collectionPath));
    toast.error(err.message || 'Pull failed');
  } finally {
    dispatch(setGitLoading({ collectionUid, isLoading: false }));
  }
};

export const fetchAndRefresh = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-fetch', { collectionPath });
    await dispatch(loadAheadBehind(collectionUid, collectionPath));
    toast.success('Fetched');
  } catch (err) {
    toast.error(err.message || 'Fetch failed');
  }
};

export const switchBranch = (collectionUid, collectionPath, branchName, shouldCreate, processUid) => async (dispatch) => {
  try {
    dispatch(setGitLoading({ collectionUid, isLoading: true }));
    await ipcInvoke('renderer:git-checkout-branch', { collectionPath, branchName, shouldCreate, processUid });
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadGitBranches(collectionUid, collectionPath)),
      dispatch(loadAheadBehind(collectionUid, collectionPath))
    ]);
    toast.success(`Switched to ${branchName}`);
  } catch (err) {
    toast.error(err.message || 'Branch switch failed');
  } finally {
    dispatch(setGitLoading({ collectionUid, isLoading: false }));
  }
};

export const switchRemoteBranch = (collectionUid, collectionPath, remoteName, branchName, processUid) => async (dispatch) => {
  try {
    dispatch(setGitLoading({ collectionUid, isLoading: true }));
    await ipcInvoke('renderer:git-checkout-remote-branch', { collectionPath, remoteName, branchName, processUid });
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadGitBranches(collectionUid, collectionPath)),
      dispatch(loadAheadBehind(collectionUid, collectionPath))
    ]);
    toast.success(`Switched to ${branchName}`);
  } catch (err) {
    toast.error(err.message || 'Branch switch failed');
  } finally {
    dispatch(setGitLoading({ collectionUid, isLoading: false }));
  }
};

export const loadStagedDiff = (collectionUid, collectionPath, filePath) => async (dispatch) => {
  try {
    const diff = await ipcInvoke('renderer:git-get-staged-diff', { collectionPath, filePath });
    dispatch(setActiveDiff({ collectionUid, diff: { filePath, type: 'staged', diff } }));
  } catch (err) {
    toast.error(err.message || 'Failed to load diff');
  }
};

export const loadUnstagedDiff = (collectionUid, collectionPath, filePath) => async (dispatch) => {
  try {
    const diff = await ipcInvoke('renderer:git-get-unstaged-diff', { collectionPath, filePath });
    dispatch(setActiveDiff({ collectionUid, diff: { filePath, type: 'unstaged', diff } }));
  } catch (err) {
    toast.error(err.message || 'Failed to load diff');
  }
};

export const createStashAndRefresh = (collectionUid, collectionPath, message) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-create-stash', { collectionPath, message });
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadGitStashes(collectionUid, collectionPath))
    ]);
    toast.success('Changes stashed');
  } catch (err) {
    toast.error(err.message || 'Stash failed');
  }
};

export const applyStashAndRefresh = (collectionUid, collectionPath, stashIndex) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-apply-stash', { collectionPath, stashIndex });
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadGitStashes(collectionUid, collectionPath))
    ]);
    toast.success('Stash applied');
  } catch (err) {
    toast.error(err.message || 'Apply stash failed');
  }
};

export const dropStashAndRefresh = (collectionUid, collectionPath, stashIndex) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-drop-stash', { collectionPath, stashIndex });
    await dispatch(loadGitStashes(collectionUid, collectionPath));
    toast.success('Stash dropped');
  } catch (err) {
    toast.error(err.message || 'Drop stash failed');
  }
};

export const abortConflict = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-abort-conflict', { collectionPath });
    await dispatch(loadGitStatus(collectionUid, collectionPath));
    toast.success('Merge aborted');
  } catch (err) {
    toast.error(err.message || 'Abort failed');
  }
};

export const continueMergeAndRefresh = (collectionUid, collectionPath, conflictedFiles, commitMessage) => async (dispatch) => {
  try {
    dispatch(setGitLoading({ collectionUid, isLoading: true }));
    await ipcInvoke('renderer:git-continue-merge', { collectionPath, conflictedFiles, commitMessage });
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadGitLogs(collectionUid, collectionPath))
    ]);
    toast.success('Merge completed');
  } catch (err) {
    toast.error(err.message || 'Continue merge failed');
  } finally {
    dispatch(setGitLoading({ collectionUid, isLoading: false }));
  }
};

export const initGitRepo = (collectionUid, collectionPath) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-init', { collectionPath });
    const gitRootPath = await ipcInvoke('renderer:git-get-root-path', { collectionPath });
    dispatch(setGitRootPath({ collectionUid, gitRootPath }));
    toast.success('Git repository initialized');
  } catch (err) {
    toast.error(err.message || 'Git init failed');
  }
};

export const addRemoteAndRefresh = (collectionUid, collectionPath, remoteName, remoteUrl) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-add-remote', { collectionPath, remoteName, remoteUrl });
    const remotes = await ipcInvoke('renderer:git-fetch-remotes', { collectionPath });
    dispatch(setGitRemotes({ collectionUid, remotes }));
    toast.success(`Remote "${remoteName}" added`);
  } catch (err) {
    toast.error(err.message || 'Add remote failed');
  }
};

export const removeRemoteAndRefresh = (collectionUid, collectionPath, remoteName) => async (dispatch) => {
  try {
    await ipcInvoke('renderer:git-remove-remote', { collectionPath, remoteName });
    const remotes = await ipcInvoke('renderer:git-fetch-remotes', { collectionPath });
    dispatch(setGitRemotes({ collectionUid, remotes }));
    toast.success(`Remote "${remoteName}" removed`);
  } catch (err) {
    toast.error(err.message || 'Remove remote failed');
  }
};

// ── Auto-Sync Thunks ──────────────────────────────────────────────────

export const autoSyncCollection = (collectionUid, collectionPath) => async (dispatch, getState) => {
  try {
    // 1. Check git root from Redux state, fallback to IPC
    let gitRootPath = getState().git.collections[collectionUid]?.gitRootPath;
    if (!gitRootPath) {
      try {
        gitRootPath = await ipcInvoke('renderer:git-get-root-path', { collectionPath });
      } catch {
        return; // not a git repo — skip silently
      }
    }
    if (!gitRootPath) return;

    dispatch(setAutoSyncStatus({ collectionUid, status: 'syncing' }));

    // 2. Stage all tracked + untracked changes under the collection path
    await ipcInvoke('renderer:git-stage-files', { collectionPath, files: [collectionPath] });

    // 3. Re-check status AFTER staging to get accurate counts
    const status = await ipcInvoke('renderer:git-get-status', { collectionPath });
    if (!status.staged.length) {
      dispatch(setAutoSyncStatus({ collectionUid, status: 'idle' }));
      return;
    }

    // 4. Commit with auto-generated message
    const fileCount = status.staged.length;
    const message = fileCount === 1
      ? `Auto-sync: updated ${status.staged[0]?.path?.split('/').pop() || '1 file'}`
      : `Auto-sync: updated ${fileCount} files`;

    await ipcInvoke('renderer:git-commit', { collectionPath, message });

    // 5. Check if remote exists — if not, just commit locally
    let remotes;
    try {
      remotes = await ipcInvoke('renderer:git-fetch-remotes', { collectionPath });
    } catch {
      remotes = [];
    }
    if (!remotes.length) {
      await Promise.all([
        dispatch(loadGitStatus(collectionUid, collectionPath)),
        dispatch(loadAheadBehind(collectionUid, collectionPath))
      ]);
      dispatch(setAutoSyncStatus({ collectionUid, status: 'done' }));
      setTimeout(() => dispatch(setAutoSyncStatus({ collectionUid, status: 'idle' })), 3000);
      return;
    }

    const remoteName = remotes[0]?.name || 'origin';

    // 6. Get current branch
    let currentBranch = getState().git.collections[collectionUid]?.currentBranch;
    if (!currentBranch) {
      currentBranch = await ipcInvoke('renderer:git-get-current-branch', { collectionPath });
    }

    // 7. Push
    const processUid = `auto-sync-push-${Date.now()}`;
    try {
      await ipcInvoke('renderer:git-push', {
        collectionPath, remote: remoteName, remoteBranch: currentBranch, processUid
      });
    } catch {
      // Push failed — pull then retry
      try {
        const pullProcessUid = `auto-sync-pull-${Date.now()}`;
        try {
          await ipcInvoke('renderer:git-pull', {
            collectionPath, remote: remoteName, remoteBranch: currentBranch,
            strategy: '--ff-only', processUid: pullProcessUid
          });
        } catch {
          await ipcInvoke('renderer:git-pull', {
            collectionPath, remote: remoteName, remoteBranch: currentBranch,
            strategy: '--no-rebase', processUid: pullProcessUid
          });
        }

        // Check for conflicts after pull
        const postPullStatus = await ipcInvoke('renderer:git-get-status', { collectionPath });
        if (postPullStatus.conflicted && postPullStatus.conflicted.length > 0) {
          dispatch(setGitStatus({ collectionUid, status: postPullStatus }));
          dispatch(setGitPanelOpen({ collectionUid, open: true }));
          dispatch(setAutoSyncStatus({ collectionUid, status: 'error' }));
          toast.error('Auto-sync: merge conflict detected. Please resolve conflicts in the Git panel.');
          return;
        }

        // Retry push
        const retryProcessUid = `auto-sync-push-retry-${Date.now()}`;
        await ipcInvoke('renderer:git-push', {
          collectionPath, remote: remoteName, remoteBranch: currentBranch, processUid: retryProcessUid
        });
      } catch (pullPushErr) {
        const failStatus = await ipcInvoke('renderer:git-get-status', { collectionPath });
        if (failStatus.conflicted && failStatus.conflicted.length > 0) {
          dispatch(setGitStatus({ collectionUid, status: failStatus }));
          dispatch(setGitPanelOpen({ collectionUid, open: true }));
          toast.error('Auto-sync: merge conflict detected. Please resolve conflicts in the Git panel.');
        } else {
          toast.error(pullPushErr.message || 'Auto-sync: push failed');
        }
        dispatch(setAutoSyncStatus({ collectionUid, status: 'error' }));
        return;
      }
    }

    // 8. Refresh git state silently
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadAheadBehind(collectionUid, collectionPath)),
      dispatch(loadGitLogs(collectionUid, collectionPath))
    ]);
    dispatch(setAutoSyncStatus({ collectionUid, status: 'done' }));
    setTimeout(() => dispatch(setAutoSyncStatus({ collectionUid, status: 'idle' })), 3000);
  } catch (err) {
    toast.error(err.message || 'Auto-sync failed');
    dispatch(setAutoSyncStatus({ collectionUid, status: 'error' }));
  }
};

export const autoSyncPull = (collectionUid, collectionPath) => async (dispatch, getState) => {
  try {
    // Check git root from Redux state
    const gitRootPath = getState().git.collections[collectionUid]?.gitRootPath;
    if (!gitRootPath) return;

    // Check if remote exists
    let remotes;
    try {
      remotes = await ipcInvoke('renderer:git-fetch-remotes', { collectionPath });
    } catch {
      return;
    }
    if (!remotes.length) return;

    const remoteName = remotes[0]?.name || 'origin';

    // Get current branch
    const currentBranch = await ipcInvoke('renderer:git-get-current-branch', { collectionPath });
    if (!currentBranch) return;

    dispatch(setAutoSyncStatus({ collectionUid, status: 'pulling' }));

    // Pull: ff-only first, fallback to merge
    const processUid = `auto-sync-pull-${Date.now()}`;
    try {
      await ipcInvoke('renderer:git-pull', {
        collectionPath, remote: remoteName, remoteBranch: currentBranch,
        strategy: '--ff-only', processUid
      });
    } catch {
      try {
        await ipcInvoke('renderer:git-pull', {
          collectionPath, remote: remoteName, remoteBranch: currentBranch,
          strategy: '--no-rebase', processUid
        });
      } catch {
        // Check for conflicts
        const status = await ipcInvoke('renderer:git-get-status', { collectionPath });
        if (status.conflicted && status.conflicted.length > 0) {
          dispatch(setGitStatus({ collectionUid, status }));
          dispatch(setGitPanelOpen({ collectionUid, open: true }));
          dispatch(setAutoSyncStatus({ collectionUid, status: 'error' }));
          toast.error('Auto-sync: pull conflict detected. Please resolve conflicts in the Git panel.');
        } else {
          dispatch(setAutoSyncStatus({ collectionUid, status: 'idle' }));
        }
        return;
      }
    }

    // Refresh status silently
    await Promise.all([
      dispatch(loadGitStatus(collectionUid, collectionPath)),
      dispatch(loadAheadBehind(collectionUid, collectionPath))
    ]);
    dispatch(setAutoSyncStatus({ collectionUid, status: 'done' }));
    setTimeout(() => dispatch(setAutoSyncStatus({ collectionUid, status: 'idle' })), 3000);
  } catch {
    // Periodic pull failures are silent
    dispatch(setAutoSyncStatus({ collectionUid, status: 'idle' }));
  }
};

export default gitSlice.reducer;
