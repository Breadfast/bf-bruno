import { autoSyncCollection, autoSyncPull } from '../../slices/git';

// Redux action types that indicate a file was just saved to disk
const saveCompletionActions = [
  'collections/saveRequest',
  'collections/saveCollectionDraft',
  'collections/saveFolderDraft',
  'collections/saveEnvironment'
];

// Debounce timers for coalescing rapid saves per collection
const pendingSyncTimers = {};

// Periodic pull timeout handles per collection (recursive setTimeout, not setInterval)
const pullTimeoutTimers = {};

// Re-entrancy guard: tracks collections currently being synced or pulled
const syncInProgress = new Set();
const pullInProgress = new Set();

const SYNC_DEBOUNCE_MS = 2000;

const scheduleSyncForCollection = (collectionUid, collectionPath, dispatch) => {
  clearTimeout(pendingSyncTimers[collectionUid]);
  pendingSyncTimers[collectionUid] = setTimeout(async () => {
    delete pendingSyncTimers[collectionUid];
    if (syncInProgress.has(collectionUid)) return;
    syncInProgress.add(collectionUid);
    try {
      await dispatch(autoSyncCollection(collectionUid, collectionPath));
    } finally {
      syncInProgress.delete(collectionUid);
    }
  }, SYNC_DEBOUNCE_MS);
};

// Use recursive setTimeout instead of setInterval to prevent overlapping pulls
const schedulePull = (collectionUid, collectionPath, intervalMs, dispatch) => {
  pullTimeoutTimers[collectionUid] = setTimeout(async () => {
    if (!pullInProgress.has(collectionUid) && !syncInProgress.has(collectionUid)) {
      pullInProgress.add(collectionUid);
      try {
        await dispatch(autoSyncPull(collectionUid, collectionPath));
      } finally {
        pullInProgress.delete(collectionUid);
      }
    }
    // Schedule next pull only if still registered (not stopped)
    if (pullTimeoutTimers[collectionUid] !== undefined) {
      schedulePull(collectionUid, collectionPath, intervalMs, dispatch);
    }
  }, intervalMs);
};

const startPullTimer = (collectionUid, collectionPath, intervalMs, dispatch) => {
  if (pullTimeoutTimers[collectionUid] !== undefined) return; // already running
  schedulePull(collectionUid, collectionPath, intervalMs, dispatch);
};

const stopPullTimer = (collectionUid) => {
  clearTimeout(pullTimeoutTimers[collectionUid]);
  delete pullTimeoutTimers[collectionUid];
};

const stopAllPullTimers = () => {
  Object.keys(pullTimeoutTimers).forEach(stopPullTimer);
};

const clearAllSyncTimers = () => {
  Object.keys(pendingSyncTimers).forEach((key) => {
    clearTimeout(pendingSyncTimers[key]);
    delete pendingSyncTimers[key];
  });
};

const restartAllPullTimers = (getState, dispatch) => {
  stopAllPullTimers();
  const { autoSync } = getState().app.preferences;
  if (!autoSync?.enabled) return;

  const collections = getState().collections.collections || [];
  const gitCollections = getState().git.collections || {};

  collections.forEach((collection) => {
    const gitState = gitCollections[collection.uid];
    if (gitState?.gitRootPath) {
      startPullTimer(collection.uid, collection.pathname, autoSync.pullInterval, dispatch);
    }
  });
};

// Find the collection that owns a given item/folder/environment
const findCollectionForPayload = (payload, getState) => {
  const { collectionUid } = payload || {};
  if (!collectionUid) return null;

  const collections = getState().collections.collections || [];
  const collection = collections.find((c) => c.uid === collectionUid);
  if (!collection) return null;

  return { collectionUid: collection.uid, collectionPath: collection.pathname };
};

export const autosyncMiddleware = ({ dispatch, getState }) => (next) => (action) => {
  const result = next(action);

  const { autoSync } = getState().app.preferences;

  // Handle preference changes
  if (action.type === 'app/updatePreferences') {
    const newAutoSync = action.payload?.autoSync;
    if (newAutoSync?.enabled) {
      restartAllPullTimers(getState, dispatch);
    } else if (newAutoSync?.enabled === false) {
      stopAllPullTimers();
      clearAllSyncTimers();
    }
    return result;
  }

  if (!autoSync?.enabled) return result;

  // When git root path is set for a collection, start its pull timer
  if (action.type === 'git/setGitRootPath') {
    const { collectionUid } = action.payload;
    const collections = getState().collections.collections || [];
    const collection = collections.find((c) => c.uid === collectionUid);
    if (collection && action.payload.gitRootPath) {
      startPullTimer(collectionUid, collection.pathname, autoSync.pullInterval, dispatch);
    }
    return result;
  }

  // When a collection is removed, stop its pull timer
  if (action.type === 'collections/removeCollection') {
    const { collectionUid } = action.payload || {};
    if (collectionUid) {
      stopPullTimer(collectionUid);
    }
    return result;
  }

  // Intercept save-completion actions to trigger auto-sync
  if (!saveCompletionActions.includes(action.type)) return result;

  const target = findCollectionForPayload(action.payload, getState);
  if (target) {
    scheduleSyncForCollection(target.collectionUid, target.collectionPath, dispatch);
  }

  return result;
};
