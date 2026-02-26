import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export { BackBtn, PageContainer, PageHeader } from "@components/PageLayout/styles";

export const PageTitle = styled.h1`
  color: aquamarine;
  font-size: 1.4rem;
  margin: 0 0 16px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;
