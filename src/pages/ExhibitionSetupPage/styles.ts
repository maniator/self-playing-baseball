import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export { BackBtn, PageContainer, PageHeader } from "@components/PageLayout/styles";

export const PageTitle = styled.h1`
  color: aquamarine;
  font-size: 1.5rem;
  margin: 0 0 20px;

  ${mq.mobile} {
    font-size: 1.3rem;
    margin-bottom: 16px;
  }
`;
