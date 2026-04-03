import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Collection from './Collection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import { normalizePath } from 'utils/common/path';
import { isScratchCollection } from 'utils/collections';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  const [searchText, setSearchText] = useState('');
  const dispatch = useDispatch();
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

  // Mount all collections when sidebar search is activated
  useEffect(() => {
    if (showSearch && workspaceCollections.length > 0) {
      workspaceCollections.forEach((collection) => {
        if (collection.mountStatus !== 'mounted' && collection.pathname) {
          dispatch(mountCollection({
            collectionUid: collection.uid,
            collectionPathname: collection.pathname,
            brunoConfig: collection.brunoConfig
          }));
        }
      });
    }
  }, [showSearch]);

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
      </div>
    </StyledWrapper>
  );
};

export default Collections;
