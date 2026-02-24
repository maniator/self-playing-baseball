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
  background: #7a2020;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 16px 20px;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  text-align: center;

  &:hover {
    background: #8e2626;
  }

  &:active {
    background: #5e1a1a;
  }
`;

export const SecondaryBtn = styled.button`
  background: transparent;
  color: #bbb;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 14px 20px;
  font-size: 0.95rem;
  cursor: pointer;
  min-height: 48px;
  text-align: center;

  &:hover {
    background: #111;
    border-color: #666;
    color: #ddd;
  }
`;
