import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 32px 24px calc(32px + 80px);
  gap: 16px;
`;

export const HomeLogo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.logo};

  ${mq.mobile} {
    font-size: 2.5rem;
  }
`;

export const HomeTitle = styled.h1`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.fontSizes.title};
  margin: 0;
  text-align: center;

  ${mq.mobile} {
    font-size: 1.8rem;
  }
`;

export const HomeSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textSubdued};
  font-size: 0.95rem;
  margin: 0;
  text-align: center;
`;

export const MenuGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(100%, 300px);
  margin-top: 16px;
`;

export const PrimaryBtn = styled.button`
  background: ${({ theme }) => theme.colors.greenBg};
  color: ${({ theme }) => theme.colors.accentGreen};
  border: 1px solid ${({ theme }) => theme.colors.borderGreen};
  border-radius: 6px;
  padding: 16px 20px;
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
  border-radius: 6px;
  padding: 14px 20px;
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
  margin-top: 8px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderPanel};
  border-radius: 8px;
  width: min(100%, 300px);
  text-align: center;
`;

export const LeagueTeaserTitle = styled.p`
  color: ${({ theme }) => theme.colors.textGold};
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0 0 4px;
`;

export const LeagueTeaserSub = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.78rem;
  margin: 0;
  line-height: 1.4;
`;
