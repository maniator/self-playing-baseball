import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: 16px;
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

export const BackBtn = styled.button`
  background: transparent;
  color: #6680aa;
  border: none;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 0;
  min-height: 36px;

  &:hover {
    color: #aaccff;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
    border-radius: 3px;
  }
`;

export const PageTitle = styled.h1`
  color: aquamarine;
  font-size: 1.4rem;
  margin: 0 0 16px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;
