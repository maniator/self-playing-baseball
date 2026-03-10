import styled from "styled-components";

export const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: ${({ theme }) => theme.colors.accentPrimary};
    cursor: pointer;
    width: 14px;
    height: 14px;
  }
`;

export const Select = styled.select`
  background: ${({ theme }) => theme.colors.bgInputSm};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 8px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
`;

export const NotifBadge = styled.span<{ $ok: boolean }>`
  font-size: 11px;
  color: ${({ $ok }) => ($ok ? "#4ade80" : "#fbbf24")};
  cursor: ${({ $ok }) => ($ok ? "default" : "pointer")};
  white-space: nowrap;
`;

export const SubButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondaryLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  min-height: 30px;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;
