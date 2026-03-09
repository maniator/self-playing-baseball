import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export { BackBtn, PageContainer, PageHeader } from "@shared/components/PageLayout/styles";

export const PageTitle = styled.h1`
  color: aquamarine;
  font-size: 1.5rem;
  margin: 0 0 20px;

  ${mq.mobile} {
    font-size: 1.3rem;
    margin-bottom: 16px;
  }
`;
