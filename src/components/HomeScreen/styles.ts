import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 32px 24px;
  gap: 16px;
`;

export const HomeLogo = styled.div`
  font-size: 3rem;

  ${mq.mobile} {
    font-size: 2.5rem;
  }
`;

export const HomeTitle = styled.h1`
  color: white;
  font-size: 2.2rem;
  margin: 0;
  text-align: center;

  ${mq.mobile} {
    font-size: 1.8rem;
  }
`;

export const HomeSubtitle = styled.p`
  color: #888;
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
  background: #1a3a2a;
  color: #6effc0;
  border: 1px solid #3a7a5a;
  border-radius: 6px;
  padding: 16px 20px;
  font-size: 1.05rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  min-height: 52px;
  text-align: center;

  &:hover {
    background: #254f38;
  }

  &:active {
    background: #0e2418;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;

export const SecondaryBtn = styled.button`
  background: transparent;
  color: #bbb;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 14px 20px;
  font-size: 0.95rem;
  font-family: inherit;
  cursor: pointer;
  min-height: 48px;
  text-align: center;

  &:hover {
    background: #111;
    border-color: #666;
    color: #ddd;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
  }
`;
