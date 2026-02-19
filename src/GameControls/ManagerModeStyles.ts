import styled from "styled-components";

export const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: aquamarine;
    cursor: pointer;
    width: 14px;
    height: 14px;
  }
`;

export const Select = styled.select`
  background: #1a2440;
  border: 1px solid #4a6090;
  color: #fff;
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
