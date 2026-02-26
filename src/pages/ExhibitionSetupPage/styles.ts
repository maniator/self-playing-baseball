import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

/** Full-page wrapper that mimics the NewGameDialog visual style without `<dialog>`. */
export const PageContainer = styled.div`
  background: #0d1b2e;
  color: #e0f0ff;
  border: 2px solid #4a6090;
  border-radius: 14px;
  padding: 18px 32px 14px;
  max-width: min(420px, 92vw);
  width: 100%;
  max-height: min(90dvh, 820px);
  overflow-y: auto;
  font-family: inherit;
  font-size: 14px;
  margin: 32px auto;

  ${mq.mobile} {
    padding: 14px 18px 14px;
    max-height: min(96dvh, 820px);
    border-radius: 10px;
    margin: 12px auto;
  }
`;
