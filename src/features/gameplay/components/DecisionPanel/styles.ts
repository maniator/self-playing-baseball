import styled from "styled-components";

export const Panel = styled.div`
  background: rgba(0, 30, 60, 0.92);
  border: 2px solid aquamarine;
  border-radius: 12px;
  padding: 14px 18px 10px;
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 14px;
`;

export const CountdownRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
`;

export const CountdownTrack = styled.div`
  flex: 1;
  height: 4px;
  background: #1a2e1a;
  border-radius: 2px;
  overflow: hidden;
`;

export const CountdownFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $pct }) => ($pct > 50 ? "#44cc88" : $pct > 25 ? "#ffaa33" : "#ff4444")};
  border-radius: 2px;
  transition:
    width 0.95s linear,
    background 0.5s ease;
`;

export const CountdownLabel = styled.span`
  color: #888;
  font-size: 11px;
  white-space: nowrap;
  min-width: 52px;
  text-align: right;
`;
