import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export { BackBtn, PageContainer, PageHeader } from "@shared/components/PageLayout/styles";

export const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.accentPrimary};
  font-size: ${({ theme }) => theme.fontSizes.h2};
  margin: 0 0 ${({ theme }) => theme.spacing.lg};

  ${mq.mobile} {
    font-size: ${({ theme }) => theme.fontSizes.h3};
  }
`;

export const Copy = styled.p`
  color: ${({ theme }) => theme.colors.textBody};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
  line-height: 1.5;
`;

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderPanel};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const SubTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
`;

export const ContactLink = styled.a`
  color: ${({ theme }) => theme.colors.textLink};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: bold;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`;

export const SecondaryLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg}`};
  min-height: ${({ theme }) => theme.sizes.btnLg};
  font-weight: bold;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.bgNavSection};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.colors.helpButtonBgHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const Divider = styled.hr`
  width: 100%;
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.borderPanel};
  margin: ${({ theme }) => `${theme.spacing.sm} 0 ${theme.spacing.lg}`};
`;

export const OfflineNote = styled.p`
  color: ${({ theme }) => theme.colors.textHint};
  font-style: italic;
  margin: 0 0 ${({ theme }) => theme.spacing.md};
`;

export const List = styled.ul`
  margin: ${({ theme }) => theme.spacing.md} 0 0;
  padding-left: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textHint};
`;

export const ListItem = styled.li`
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;
