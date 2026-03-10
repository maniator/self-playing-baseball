import styled from "styled-components";

export const Panel = styled.div`
  background: ${({ theme }) => theme.colors.bgDecisionOverlay};
  border: 2px solid ${({ theme }) => theme.colors.accentPrimary};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing.s14} ${({ theme }) => theme.spacing.s18}
    ${({ theme }) => theme.spacing.s10};
  margin-top: ${({ theme }) => theme.spacing.s10};
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.s10};
  align-items: center;
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

export const CountdownRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

export const CountdownTrack = styled.div`
  flex: 1;
  height: ${({ theme }) => theme.sizes.progressBar};
  background: ${({ theme }) => theme.colors.bgDecisionSection};
  border-radius: ${({ theme }) => theme.radii.xxs};
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
  border-radius: ${({ theme }) => theme.radii.xxs};
  transition:
    width 0.95s linear,
    background 0.5s ease;
`;

export const CountdownLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: nowrap;
  min-width: ${({ theme }) => theme.sizes.countdownLabel};
  text-align: right;
`;
