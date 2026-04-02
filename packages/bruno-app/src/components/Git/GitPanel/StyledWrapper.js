import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.sidebar.bg};
  border-left: 1px solid ${({ theme }) => theme.sidebar.border};
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);

  .git-panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 420px;
    bottom: 0;
    z-index: 999;
  }

  .git-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};
    min-height: 40px;

    .branch-name {
      font-weight: 600;
      font-size: 13px;
      color: ${({ theme }) => theme.text};
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .git-action-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};
  }

  .git-action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid ${({ theme }) => theme.sidebar.border};
    background: transparent;
    color: ${({ theme }) => theme.text};

    &:hover {
      background: ${({ theme }) => theme.sidebar.hoverBg};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .badge {
      font-size: 10px;
      padding: 0 4px;
      border-radius: 8px;
      background: ${({ theme }) => theme.textLink};
      color: white;
      min-width: 16px;
      text-align: center;
    }
  }

  .git-tabs {
    display: flex;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};

    .git-tab {
      flex: 1;
      padding: 6px 12px;
      font-size: 12px;
      text-align: center;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      color: ${({ theme }) => theme.text};
      opacity: 0.6;
      background: transparent;
      border-top: none;
      border-left: none;
      border-right: none;

      &:hover {
        opacity: 0.8;
      }

      &.active {
        opacity: 1;
        border-bottom-color: ${({ theme }) => theme.textLink};
        font-weight: 600;
      }
    }
  }

  .git-panel-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
  }

  .file-entry {
    display: flex;
    align-items: center;
    padding: 3px 12px;
    font-size: 12px;
    cursor: pointer;
    color: ${({ theme }) => theme.text};

    &:hover {
      background: ${({ theme }) => theme.sidebar.hoverBg};
    }

    .file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0 6px;
    }

    .file-status {
      font-size: 10px;
      font-weight: 600;
      width: 16px;
      text-align: center;
      flex-shrink: 0;

      &.added { color: #2ea043; }
      &.modified { color: #d29922; }
      &.deleted { color: #f85149; }
      &.renamed { color: #58a6ff; }
      &.untracked { color: #2ea043; }
      &.conflicted { color: #f85149; }
    }

    .file-actions {
      display: flex;
      gap: 2px;
      opacity: 0;
    }

    &:hover .file-actions {
      opacity: 1;
    }
  }

  .commit-section {
    padding: 8px 12px;
    border-top: 1px solid ${({ theme }) => theme.sidebar.border};

    .commit-input {
      width: 100%;
      padding: 6px 8px;
      font-size: 12px;
      border: 1px solid ${({ theme }) => theme.sidebar.border};
      border-radius: 4px;
      background: transparent;
      color: ${({ theme }) => theme.text};
      resize: none;
      min-height: 60px;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.textLink};
      }
    }

    .commit-btn {
      width: 100%;
      padding: 6px;
      margin-top: 6px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: ${({ theme }) => theme.textLink};
      color: white;

      &:hover {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .diff-panel {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    .diff-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 600;
      color: ${({ theme }) => theme.text};
    }

    .diff-content {
      font-family: 'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.5;

      .diff-line {
        padding: 0 8px;

        &.added {
          background: rgba(46, 160, 67, 0.15);
          color: #2ea043;
        }
        &.removed {
          background: rgba(248, 81, 73, 0.15);
          color: #f85149;
        }
        &.header {
          color: ${({ theme }) => theme.textLink};
          font-weight: 600;
          margin-top: 8px;
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    color: ${({ theme }) => theme.text};
    opacity: 0.5;
    font-size: 13px;
    text-align: center;
  }

  .conflict-banner {
    padding: 8px 12px;
    background: rgba(248, 81, 73, 0.1);
    border-bottom: 1px solid rgba(248, 81, 73, 0.3);
    font-size: 12px;
    color: #f85149;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .branch-list {
    max-height: 200px;
    overflow-y: auto;

    .branch-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
      color: ${({ theme }) => theme.text};

      &:hover {
        background: ${({ theme }) => theme.sidebar.hoverBg};
      }

      &.current {
        font-weight: 600;
      }
    }
  }

  .log-entry {
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    color: ${({ theme }) => theme.text};
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};

    &:hover {
      background: ${({ theme }) => theme.sidebar.hoverBg};
    }

    .log-message {
      font-weight: 500;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .log-meta {
      font-size: 10px;
      opacity: 0.6;
      display: flex;
      gap: 8px;
    }
  }

  .stash-entry {
    padding: 6px 12px;
    font-size: 12px;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};
    display: flex;
    align-items: center;
    justify-content: space-between;

    .stash-message {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: ${({ theme }) => theme.text};
    }

    .stash-actions {
      display: flex;
      gap: 4px;
    }
  }
`;

export default StyledWrapper;
