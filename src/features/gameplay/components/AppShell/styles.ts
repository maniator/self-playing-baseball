import styled from "styled-components";

/** Fixed frosted-glass volume bar shown on all non-game routes. */
export const AppVolumeBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing.s10} ${({ theme }) => theme.spacing.lg} calc(${({ theme }) => theme.spacing.s10} + env(safe-area-inset-bottom)) ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.overlayLight};
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;
