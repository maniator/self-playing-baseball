import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export { BackBtn, PageContainer, PageHeader } from "@shared/components/PageLayout/styles";

export const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.accentPrimary};
  font-size: 1.4rem;
  margin: 0 0 16px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;
