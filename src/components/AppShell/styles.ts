import styled from "styled-components";

/** Fixed frosted-glass volume bar shown on all non-game routes. */
export const AppVolumeBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;
