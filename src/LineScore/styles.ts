import styled from "styled-components";

export const Wrapper = styled.div`
  overflow-x: auto;
  margin: 8px 0 4px;
`;

export const Table = styled.table`
  border-collapse: collapse;
  font-family: "Courier New", Courier, monospace;
  font-size: 13px;
  background: #0a1628;
  color: #e8d5a3;
  width: 100%;
  min-width: 340px;
`;

export const Th = styled.th<{ $accent?: boolean }>`
  padding: 3px 6px;
  text-align: center;
  color: ${({ $accent }) => ($accent ? "#f5c842" : "#8abadf")};
  border-bottom: 1px solid #1e3a5f;
  font-weight: normal;
  font-size: 11px;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

export const TeamTh = styled(Th)`
  text-align: left;
  min-width: 60px;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Td = styled.td<{ $active?: boolean; $accent?: boolean; $dim?: boolean }>`
  padding: 4px 6px;
  text-align: center;
  font-weight: ${({ $accent }) => ($accent ? "bold" : "normal")};
  color: ${({ $active, $accent, $dim }) =>
    $active ? "#ffffff" : $accent ? "#f5c842" : $dim ? "#3d5a7a" : "#e8d5a3"};
  border-right: ${({ $accent }) => ($accent ? "none" : "1px solid #0f2540")};
  white-space: nowrap;
`;

export const TeamTd = styled(Td)`
  text-align: left;
  font-size: 12px;
  border-right: 1px solid #1e3a5f;
  padding-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
`;

export const DividerTd = styled.td`
  border-left: 1px solid #1e3a5f;
  padding: 0;
  width: 4px;
`;
