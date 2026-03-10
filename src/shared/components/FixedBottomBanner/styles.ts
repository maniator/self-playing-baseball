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
  background: #0d1b2e;
  color: #cce0ff;
  border-top: 2px solid #4a6090;
  /* top | horizontal | bottom — bottom includes safe-area so the banner clears the home indicator */
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  font-size: 0.875rem;
`;
