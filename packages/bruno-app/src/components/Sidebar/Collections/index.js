import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import Collection from './Collection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import { normalizePath } from 'utils/common/path';
import { isScratchCollection } from 'utils/collections';

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  const [searchText, setSearchText] = useState('');
  const [fsSearchResults, setFsSearchResults] = useState([]);
  const fsSearchTimeoutRef = useRef(null);
  const { collections } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');

  const workspaceCollections = useMemo(() => {
    if (!activeWorkspace) return [];

    return collections.filter((c) => {
      if (isScratchCollection(c, workspaces)) {
        return false;
      }
      return activeWorkspace.collections?.some((wc) => normalizePath(wc.path) === normalizePath(c.pathname));
    });
  }, [activeWorkspace, collections, workspaces]);

  // Filesystem search for sidebar — searches unmounted collections via IPC
  useEffect(() => {
    if (!searchText || searchText.trim().length < 2) {
      setFsSearchResults([]);
      return;
    }

    if (fsSearchTimeoutRef.current) {
      clearTimeout(fsSearchTimeoutRef.current);
    }

    fsSearchTimeoutRef.current = setTimeout(async () => {
      const unmounted = workspaceCollections.filter(
        (c) => c.mountStatus !== 'mounted' && c.pathname
      ).map((c) => ({ pathname: c.pathname, uid: c.uid, name: c.name }));

      if (unmounted.length === 0) {
        setFsSearchResults([]);
        return;
      }

      try {
        const results = await window.ipcRenderer.invoke('renderer:search-collections-on-disk', {
          collectionPaths: unmounted,
          searchQuery: searchText
        });
        setFsSearchResults(results || []);
      } catch {
        setFsSearchResults([]);
      }
    }, 300);

    return () => {
      if (fsSearchTimeoutRef.current) clearTimeout(fsSearchTimeoutRef.current);
    };
  }, [searchText, workspaceCollections]);

  if (!workspaceCollections || !workspaceCollections.length) {
    return (
      <StyledWrapper>
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}
        {!isCreatingCollection && <CreateOrOpenCollection onCreateClick={onCreateClick} />}
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper data-testid="collections">
      {showSearch && (
        <CollectionSearch searchText={searchText} setSearchText={setSearchText} />
      )}

      <div className="collections-list">
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}
        {workspaceCollections && workspaceCollections.length
          ? workspaceCollections.map((c) => {
              return (
                <Collection searchText={searchText} collection={c} key={c.uid} />
              );
            })
          : null}

        {/* Filesystem search results for unmounted collections */}
        {searchText && fsSearchResults.length > 0 && (
          <div className="fs-search-results" style={{ borderTop: '1px solid var(--color-sidebar-border, #333)', paddingTop: 4, marginTop: 4 }}>
            {(() => {
              // Group by collection
              const grouped = {};
              fsSearchResults.forEach((r) => {
                if (!grouped[r.collectionName]) grouped[r.collectionName] = [];
                grouped[r.collectionName].push(r);
              });

              return Object.entries(grouped).map(([colName, items]) => (
                <div key={colName} style={{ marginBottom: 4 }}>
                  <div style={{ padding: '4px 8px', fontSize: 12, fontWeight: 600, opacity: 0.6 }}>
                    {colName}
                  </div>
                  {items.map((item, i) => (
                    <div
                      key={i}
                      style={{ padding: '3px 8px 3px 16px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      className="collection-item-name"
                      title={item.url}
                    >
                      <span style={{ fontSize: 10, fontWeight: 600, color: item.method === 'GET' ? '#2ea043' : item.method === 'POST' ? '#d29922' : item.method === 'PUT' ? '#58a6ff' : item.method === 'DELETE' ? '#f85149' : 'inherit', minWidth: 28 }}>
                        {item.method}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
