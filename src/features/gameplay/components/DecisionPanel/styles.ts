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

// ── Decision button variants ─────────────────────────────────────────────────

export const ActionButton = styled.button`
  background: ${({ theme }) => theme.colors.accentPrimary};
  color: ${({ theme }) => theme.colors.btnTextDark};
  padding: ${({ theme }) => theme.spacing.s7} ${({ theme }) => theme.spacing.s14};
  border-radius: ${({ theme }) => theme.radii.pill};
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.textPrimary};
    outline-offset: 2px;
  }
`;

export const SkipButton = styled(ActionButton)`
  background: ${({ theme }) => theme.colors.bgDecisionButton};
  color: ${({ theme }) => theme.colors.textLight};
`;

export const Prompt = styled.span`
  flex: 1 1 auto;
  color: ${({ theme }) => theme.colors.textDecisionActive};
  font-weight: 600;
`;

export const Odds = styled.span`
  color: ${({ theme }) => theme.colors.textDecisionHighlight};
  font-size: ${({ theme }) => theme.fontSizes.base};
`;
