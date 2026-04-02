import React from 'react';
import { useDispatch } from 'react-redux';
import { IconGitFork } from '@tabler/icons';
import Modal from 'components/Modal';
import { initGitRepo } from 'providers/ReduxStore/slices/git';

const GitInitModal = ({ collectionUid, collectionPath, onClose }) => {
  const dispatch = useDispatch();

  const handleInit = async () => {
    await dispatch(initGitRepo(collectionUid, collectionPath));
    onClose();
  };

  return (
    <Modal
      size="sm"
      title="Git"
      handleCancel={onClose}
      hideFooter={true}
    >
      <div className="flex flex-col items-center py-6 px-4">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: 'rgba(128, 128, 128, 0.1)' }}
        >
          <IconGitFork size={32} strokeWidth={1.5} style={{ opacity: 0.6 }} />
        </div>
        <h3 className="text-base font-semibold mb-2">Initialize Git Repository</h3>
        <p className="text-sm text-center mb-6" style={{ opacity: 0.6 }}>
          Start tracking your changes with Git. Initialize a new repository to enable version control.
        </p>
        <button
          onClick={handleInit}
          className="flex items-center gap-2 px-4 py-2 rounded border text-sm cursor-pointer"
          style={{ background: 'transparent', borderColor: 'rgba(128, 128, 128, 0.3)' }}
        >
          <IconGitFork size={16} strokeWidth={1.5} />
          Initialize Git
        </button>
      </div>
    </Modal>
  );
};

export default GitInitModal;
