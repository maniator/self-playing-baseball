import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;

  ${mq.mobile} {
    padding: 16px;
    height: 100dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

export const BackBtn = styled.button`
  background: transparent;
  color: #6680aa;
  border: none;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 0;
  min-height: 36px;

  &:hover {
    color: #aaccff;
  }

  &:focus-visible {
    outline: 2px solid aquamarine;
    outline-offset: 2px;
    border-radius: 3px;
  }
`;

export const PageTitle = styled.h1`
  color: aquamarine;
  font-size: 1.4rem;
  margin: 0 0 16px;

  ${mq.mobile} {
    font-size: 1.2rem;
  }
`;

export const SectionDetails = styled.details`
  border: 1px solid rgba(74, 96, 144, 0.35);
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;

  &[open] > summary {
    border-bottom: 1px solid rgba(74, 96, 144, 0.35);
  }
`;

export const SectionSummary = styled.summary`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #88bbee;
  cursor: pointer;
  user-select: none;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    content: "▸";
    font-size: 11px;
    color: #4a6090;
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  details[open] > &::after {
    transform: rotate(90deg);
  }

  &:hover {
    background: rgba(74, 96, 144, 0.15);
  }
`;

export const SectionBody = styled.div`
  padding: 10px 14px 12px;
`;

export const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: #cce0ff;
`;

export const Li = styled.li`
  margin-bottom: 4px;
  font-size: 14px;
  line-height: 1.6;
`;
