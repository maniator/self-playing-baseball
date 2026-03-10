import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.spacing.xxxl} ${({ theme }) => theme.spacing.xxl}
    calc(${({ theme }) => theme.spacing.xxxl} + 80px);
  gap: ${({ theme }) => theme.spacing.lg};
`;

export const HomeLogo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.logo};

  ${mq.mobile} {
    font-size: ${({ theme }) => theme.fontSizes.displayMd};
  }
`;

export const HomeTitle = styled.h1`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.fontSizes.title};
  margin: 0;
  text-align: center;

  ${mq.mobile} {
    font-size: ${({ theme }) => theme.fontSizes.displaySm};
  }
`;

export const HomeSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: ${({ theme }) => theme.fontSizes.body};
  margin: 0;
  text-align: center;
`;

export const MenuGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.s14};
  width: min(100%, 300px);
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

export const PrimaryBtn = styled.button`
  background: ${({ theme }) => theme.colors.greenBg};
  color: ${({ theme }) => theme.colors.accentGreen};
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.xl};
  font-size: 1.05rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  min-height: 52px;
  text-align: center;

  &:hover {
    background: ${({ theme }) => theme.colors.greenHover};
  }

  &:active {
    background: ${({ theme }) => theme.colors.greenActive};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

export const SecondaryBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textLink};
  border: 1px solid ${({ theme }) => theme.colors.borderForm};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 14px ${({ theme }) => theme.spacing.xl};
  font-size: 0.95rem;
  font-family: inherit;
  cursor: pointer;
  min-height: 48px;
  text-align: center;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    border-color: ${({ theme }) => theme.colors.textSecondaryLink};
    color: ${({ theme }) => theme.colors.textBody};
  }

  &:active {
    background: ${({ theme }) => theme.colors.bgGameDeep};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentPrimary};
    outline-offset: 2px;
  }
`;

/** Non-interactive teaser box for upcoming League mode. */
export const LeagueTeaserBox = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderPanel};
  border-radius: ${({ theme }) => theme.radii.lg};
  width: min(100%, 300px);
  text-align: center;
`;

export const LeagueTeaserTitle = styled.p`
  color: ${({ theme }) => theme.colors.textGold};
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
`;

export const LeagueTeaserSub = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.78rem;
  margin: 0;
  line-height: 1.4;
`;
