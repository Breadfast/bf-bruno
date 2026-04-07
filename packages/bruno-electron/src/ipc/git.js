const { ipcMain } = require('electron');
const {
  getCollectionGitRootPath,
  getCollectionGitData,
  getChangedFilesInCollectionGit,
  stageChanges,
  unstageChanges,
  discardChanges,
  commitChanges,
  pushGitChanges,
  pullGitChanges,
  fetchChanges,
  fetchRemotes,
  fetchRemoteBranches,
  getCollectionGitBranches,
  getCurrentGitBranch,
  getDefaultGitBranch,
  checkoutGitBranch,
  checkoutRemoteGitBranch,
  getCollectionGitLogs,
  getCollectionGitTagsWithDetails,
  getAheadBehindCount,
  getStagedFileDiff,
  getUnstagedFileDiff,
  getRenamedFileDiff,
  getFileContentForVisualDiff,
  getWorkingFileContentForVisualDiff,
  abortConflictResolution,
  continueMerge,
  createStash,
  listStashes,
  applyStash,
  dropStash,
  getStashFiles,
  getStashFileDiff,
  getStashFileContentForVisualDiff,
  getCommitFiles,
  getCommitFileDiff,
  getCommitCompareFiles,
  getCommitCompareFileDiff,
  getFileGitHistory,
  getGitGraph,
  initGit,
  addRemote,
  removeRemote,
  canPush,
  cloneGitRepository
} = require('../utils/git');
const { createDirectory, removePath } = require('../utils/filesystem');

const resolveGitRoot = (collectionPath) => {
  const gitRootPath = getCollectionGitRootPath(collectionPath);
  if (!gitRootPath) {
    throw new Error('Not a git repository');
  }
  return gitRootPath;
};

const registerGitIpc = (mainWindow) => {
  // ── Clone ──────────────────────────────────────────────────────────

  ipcMain.handle('renderer:clone-git-repository', async (event, { url, path, processUid }) => {
    let directoryCreated = false;
    try {
      await createDirectory(path);
      directoryCreated = true;
      await cloneGitRepository(mainWindow, { url, path, processUid });
      return 'Repository cloned successfully';
    } catch (error) {
      if (directoryCreated) {
        await removePath(path);
      }
      throw error;
    }
  });

  // ── Init & Root Path ───────────────────────────────────────────────

  ipcMain.handle('renderer:git-get-root-path', async (event, { collectionPath }) => {
    return getCollectionGitRootPath(collectionPath);
  });

  ipcMain.handle('renderer:git-init', async (event, { collectionPath }) => {
    // Walk up from collectionPath to find the workspace root
    // (the parent of the 'collections' directory)
    const fs = require('fs');
    const path = require('path');
    let dir = collectionPath;
    let initPath = collectionPath;

    // Walk up to find the directory that contains 'workspace.yml' or is the parent of 'collections/'
    while (dir && dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, 'workspace.yml'))) {
        initPath = dir;
        break;
      }
      const parent = path.dirname(dir);
      if (path.basename(dir) === 'collections' && fs.existsSync(path.join(parent, 'workspace.yml'))) {
        initPath = parent;
        break;
      }
      dir = parent;
    }

    return initGit(initPath);
  });

  // ── Status & Changed Files ─────────────────────────────────────────

  ipcMain.handle('renderer:git-get-status', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getChangedFilesInCollectionGit(gitRootPath, collectionPath);
  });

  ipcMain.handle('renderer:git-get-collection-data', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCollectionGitData(gitRootPath, collectionPath);
  });

  // ── Staging ────────────────────────────────────────────────────────

  ipcMain.handle('renderer:git-stage-files', async (event, { collectionPath, files }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return stageChanges(gitRootPath, files);
  });

  ipcMain.handle('renderer:git-unstage-files', async (event, { collectionPath, files }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return unstageChanges(gitRootPath, files);
  });

  ipcMain.handle('renderer:git-discard-files', async (event, { collectionPath, files }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return discardChanges(gitRootPath, files);
  });

  // ── Commit ─────────────────────────────────────────────────────────

  ipcMain.handle('renderer:git-commit', async (event, { collectionPath, message }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return commitChanges(gitRootPath, message);
  });

  // ── Push & Pull & Fetch ────────────────────────────────────────────

  ipcMain.handle('renderer:git-push', async (event, { collectionPath, remote, remoteBranch, processUid }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return pushGitChanges(mainWindow, { gitRootPath, processUid, remote, remoteBranch });
  });

  ipcMain.handle('renderer:git-can-push', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return canPush(gitRootPath);
  });

  ipcMain.handle('renderer:git-pull', async (event, { collectionPath, remote, remoteBranch, strategy, processUid }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return pullGitChanges(mainWindow, { gitRootPath, processUid, remote, remoteBranch, strategy });
  });

  ipcMain.handle('renderer:git-fetch', async (event, { collectionPath, remote }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return fetchChanges(gitRootPath, remote);
  });

  ipcMain.handle('renderer:git-fetch-remotes', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return fetchRemotes(gitRootPath);
  });

  ipcMain.handle('renderer:git-fetch-remote-branches', async (event, { collectionPath, remote }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return fetchRemoteBranches({ gitRootPath, remote });
  });

  // ── Branches ───────────────────────────────────────────────────────

  ipcMain.handle('renderer:git-get-branches', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCollectionGitBranches(gitRootPath);
  });

  ipcMain.handle('renderer:git-get-current-branch', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCurrentGitBranch(gitRootPath);
  });

  ipcMain.handle('renderer:git-get-default-branch', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getDefaultGitBranch(gitRootPath);
  });

  ipcMain.handle('renderer:git-checkout-branch', async (event, { collectionPath, branchName, shouldCreate, processUid }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return checkoutGitBranch(mainWindow, { gitRootPath, branchName, processUid, shouldCreate });
  });

  ipcMain.handle('renderer:git-checkout-remote-branch', async (event, { collectionPath, remoteName, branchName, processUid }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return checkoutRemoteGitBranch(mainWindow, { gitRootPath, remoteName, branchName, processUid });
  });

  // ── Logs & History ─────────────────────────────────────────────────

  ipcMain.handle('renderer:git-get-logs', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCollectionGitLogs(gitRootPath);
  });

  ipcMain.handle('renderer:git-get-tags', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCollectionGitTagsWithDetails(gitRootPath);
  });

  ipcMain.handle('renderer:git-get-ahead-behind', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getAheadBehindCount(gitRootPath);
  });

  ipcMain.handle('renderer:git-get-graph', async (event, { collectionPath, branchName, limit }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getGitGraph(gitRootPath, branchName, limit);
  });

  ipcMain.handle('renderer:git-get-file-history', async (event, { collectionPath, filePath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getFileGitHistory(gitRootPath, filePath);
  });

  // ── Diffs ──────────────────────────────────────────────────────────

  ipcMain.handle('renderer:git-get-staged-diff', async (event, { collectionPath, filePath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getStagedFileDiff(gitRootPath, filePath);
  });

  ipcMain.handle('renderer:git-get-unstaged-diff', async (event, { collectionPath, filePath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getUnstagedFileDiff(gitRootPath, filePath);
  });

  ipcMain.handle('renderer:git-get-renamed-diff', async (event, { collectionPath, file }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getRenamedFileDiff(gitRootPath, file);
  });

  ipcMain.handle('renderer:git-get-visual-diff', async (event, { collectionPath, commitHash, filePath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getFileContentForVisualDiff(gitRootPath, commitHash, filePath);
  });

  ipcMain.handle('renderer:git-get-working-visual-diff', async (event, { collectionPath, filePath, type }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getWorkingFileContentForVisualDiff(gitRootPath, filePath, type);
  });

  // ── Commit Details ─────────────────────────────────────────────────

  ipcMain.handle('renderer:git-get-commit-files', async (event, { collectionPath, commitHash }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCommitFiles(gitRootPath, commitHash);
  });

  ipcMain.handle('renderer:git-get-commit-file-diff', async (event, { collectionPath, commitHash, filePath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCommitFileDiff(gitRootPath, commitHash, filePath);
  });

  ipcMain.handle('renderer:git-get-commit-compare-files', async (event, { collectionPath, fromCommit, toCommit }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCommitCompareFiles(gitRootPath, fromCommit, toCommit);
  });

  ipcMain.handle('renderer:git-get-commit-compare-file-diff', async (event, { collectionPath, fromCommit, toCommit, filePath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getCommitCompareFileDiff(gitRootPath, fromCommit, toCommit, filePath);
  });

  // ── Stash ──────────────────────────────────────────────────────────

  ipcMain.handle('renderer:git-create-stash', async (event, { collectionPath, message }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return createStash(gitRootPath, message);
  });

  ipcMain.handle('renderer:git-list-stashes', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return listStashes(gitRootPath);
  });

  ipcMain.handle('renderer:git-apply-stash', async (event, { collectionPath, stashIndex }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return applyStash(gitRootPath, stashIndex);
  });

  ipcMain.handle('renderer:git-drop-stash', async (event, { collectionPath, stashIndex }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return dropStash(gitRootPath, stashIndex);
  });

  ipcMain.handle('renderer:git-get-stash-files', async (event, { collectionPath, stashIndex }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getStashFiles(gitRootPath, stashIndex);
  });

  ipcMain.handle('renderer:git-get-stash-file-diff', async (event, { collectionPath, stashIndex, filePath, isUntracked }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getStashFileDiff(gitRootPath, stashIndex, filePath, isUntracked);
  });

  ipcMain.handle('renderer:git-get-stash-visual-diff', async (event, { collectionPath, stashIndex, filePath, isUntracked }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return getStashFileContentForVisualDiff(gitRootPath, stashIndex, filePath, isUntracked);
  });

  // ── Conflict Resolution ────────────────────────────────────────────

  ipcMain.handle('renderer:git-abort-conflict', async (event, { collectionPath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return abortConflictResolution(gitRootPath);
  });

  ipcMain.handle('renderer:git-continue-merge', async (event, { collectionPath, conflictedFiles, commitMessage }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return continueMerge(gitRootPath, conflictedFiles, commitMessage);
  });

  // ── Read conflicted file content ─────────────────────────────────

  ipcMain.handle('renderer:git-read-conflicted-file', async (event, { collectionPath, filePath }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(gitRootPath, filePath);
    return fs.readFileSync(fullPath, 'utf8');
  });

  // ── Remotes ────────────────────────────────────────────────────────

  ipcMain.handle('renderer:git-add-remote', async (event, { collectionPath, remoteName, remoteUrl }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return addRemote({ gitRootPath, remoteName, remoteUrl });
  });

  ipcMain.handle('renderer:git-remove-remote', async (event, { collectionPath, remoteName }) => {
    const gitRootPath = resolveGitRoot(collectionPath);
    return removeRemote({ gitRootPath, remoteName });
  });
};

module.exports = registerGitIpc;
