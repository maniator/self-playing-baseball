import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.spacing.xxxl} ${({ theme }) => theme.spacing.xxl}
    calc(${({ theme }) => theme.spacing.xxxl} + ${({ theme }) => theme.sizes.bottomBar});
  gap: ${({ theme }) => theme.spacing.lg};
`;

export const HomeLogo = styled.h1`
  width: ${({ theme }) => theme.sizes.logoMd};
  height: ${({ theme }) => theme.sizes.logoMd};
  margin: 0;

  img {
    width: 100%;
    height: 100%;
    display: block;
  }

  ${mq.mobile} {
    width: ${({ theme }) => theme.sizes.logoSm};
    height: ${({ theme }) => theme.sizes.logoSm};
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
  background: ${({ theme }) => theme.colors.btnPrimaryBg};
  color: ${({ theme }) => theme.colors.accentPrimary};
  border: 1px solid ${({ theme }) => theme.colors.borderAccent};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.xl};
  font-size: ${({ theme }) => theme.fontSizes.bodyXl};
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  min-height: ${({ theme }) => theme.sizes.btnXxl};
  text-align: center;

  &:hover {
    background: ${({ theme }) => theme.colors.btnPrimaryBgHover};
  }

  &:active {
    background: ${({ theme }) => theme.colors.btnPrimaryBgActive};
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
  padding: ${({ theme }) => theme.spacing.s14} ${({ theme }) => theme.spacing.xl};
  font-size: ${({ theme }) => theme.fontSizes.body};
  font-family: inherit;
  cursor: pointer;
  min-height: ${({ theme }) => theme.sizes.btnXl};
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
  color: ${({ theme }) => theme.colors.textAccent};
  font-size: ${({ theme }) => theme.fontSizes.subLg};
  font-weight: 600;
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
`;

export const LeagueTeaserSub = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sub};
  margin: 0;
  line-height: 1.4;
`;
