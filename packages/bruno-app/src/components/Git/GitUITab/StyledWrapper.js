import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .git-tab-header {
    display: flex;
    gap: 24px;
    padding: 0 16px;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};
    flex-shrink: 0;

    .git-sub-tab {
      padding: 10px 0;
      font-size: 13px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      color: ${({ theme }) => theme.text};
      opacity: 0.5;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
      white-space: nowrap;

      &:hover {
        opacity: 0.7;
      }

      &.active {
        opacity: 1;
        border-bottom-color: ${({ theme }) => theme.textLink};
      }
    }
  }

  .git-tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .changes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;

    .changes-title {
      font-size: 13px;
      font-weight: 600;
      color: ${({ theme }) => theme.text};
    }

    .changes-actions {
      display: flex;
      gap: 6px;
    }
  }

  .changes-hint {
    font-size: 12px;
    color: ${({ theme }) => theme.text};
    opacity: 0.5;
    margin-bottom: 12px;
  }

  .file-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
    color: ${({ theme }) => theme.text};
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};

    &:last-child {
      border-bottom: none;
    }

    .file-info {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      gap: 8px;

      .file-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .file-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .file-status-badge {
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;

      &.U { color: #2ea043; }
      &.M { color: #d29922; }
      &.A { color: #2ea043; }
      &.D { color: #f85149; }
      &.R { color: #58a6ff; }
      &.C { color: #f85149; }
    }
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    background: none;
    border: none;
    color: ${({ theme }) => theme.text};
    opacity: 0.5;
    padding: 0;

    &:hover {
      opacity: 1;
      background: ${({ theme }) => theme.sidebar.hoverBg};
    }

    &.danger:hover {
      color: #f85149;
    }
  }

  .commit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 13px;
    border: 1px solid ${({ theme }) => theme.sidebar.border};
    border-radius: 4px;
    background: transparent;
    color: ${({ theme }) => theme.text};
    cursor: pointer;
    margin-bottom: 16px;

    &:hover {
      background: ${({ theme }) => theme.sidebar.hoverBg};
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .section-divider {
    margin: 16px 0 8px;
  }

  .log-row {
    padding: 8px 0;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }

    .log-message {
      font-size: 13px;
      color: ${({ theme }) => theme.text};
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .log-meta {
      font-size: 11px;
      color: ${({ theme }) => theme.text};
      opacity: 0.45;
      display: flex;
      gap: 12px;
    }
  }

  .empty-state {
    text-align: center;
    padding: 40px 16px;
    color: ${({ theme }) => theme.text};
    opacity: 0.4;
    font-size: 13px;
  }

  .conflict-banner {
    padding: 10px 16px;
    margin-bottom: 12px;
    border-radius: 4px;
    background: rgba(248, 81, 73, 0.08);
    border: 1px solid rgba(248, 81, 73, 0.2);
    font-size: 12px;
    color: #f85149;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stash-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.border};
    font-size: 13px;

    .stash-message {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: ${({ theme }) => theme.text};
    }
  }
`;

export default StyledWrapper;
