import styled from "styled-components";

/**
 * Fixed-bottom banner shown while a career-stats commit is blocking a router
 * navigation.  Appears only for the brief window between the user's navigation
 * attempt and the commit completing, then disappears as the navigation
 * auto-proceeds.
 */
export const SavingBanner = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9997;
  background: #0d1b2e;
  color: #cce0ff;
  border-top: 2px solid #4a6090;
  padding: 10px 16px;
  text-align: center;
  font-size: 0.875rem;
`;
