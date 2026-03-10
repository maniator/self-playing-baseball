import styled from "styled-components";

export const Panel = styled.div`
  background: ${({ theme }) => theme.colors.bgDecisionOverlay};
  border: 2px solid ${({ theme }) => theme.colors.accentPrimary};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 14px 18px 10px;
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: ${({ theme }) => theme.fontSizes.md};
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
  background: ${({ theme }) => theme.colors.bgDecisionSection};
  border-radius: 2px;
  overflow: hidden;
`;

export const CountdownFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $pct, theme }) =>
    $pct > 50
      ? theme.colors.bsoBall
      : $pct > 25
        ? theme.colors.countdownWarn
        : theme.colors.countdownDanger};
  border-radius: 2px;
  transition:
    width 0.95s linear,
    background 0.5s ease;
`;

export const CountdownLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: nowrap;
  min-width: 52px;
  text-align: right;
`;
