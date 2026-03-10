import styled from "styled-components";

/**
 * Base styled component for fixed banners docked to the bottom of the viewport.
 * Handles safe-area inset so the content clears the home indicator on iPhone.
 * Extend this component and add layout/color overrides specific to each banner.
 */
export const FixedBottomBanner = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.bgSurface};
  color: ${({ theme }) => theme.colors.textBody};
  border-top: 2px solid ${({ theme }) => theme.colors.borderForm};
  /* Fallback for browsers without env() support */
  padding: ${({ theme }) => theme.spacing.s10} ${({ theme }) => theme.spacing.lg};
  /* Override bottom padding to include safe-area so the banner clears the home indicator */
  padding-bottom: calc(${({ theme }) => theme.spacing.s10} + env(safe-area-inset-bottom));
  font-size: ${({ theme }) => theme.fontSizes.subLg};
`;
