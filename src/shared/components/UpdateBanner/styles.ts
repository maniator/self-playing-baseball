import { FixedBottomBanner } from "@shared/components/FixedBottomBanner/styles";
import { mq } from "@shared/utils/mediaQueries";
import styled from "styled-components";

export const Banner = styled(FixedBottomBanner)`
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  ${mq.mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

export const Message = styled.p`
  margin: 0;
  flex: 1;
  line-height: 1.4;
`;

export const Actions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`;

export const ReloadButton = styled.button`
  background: #22c55e;
  border: none;
  color: #000;
  cursor: pointer;
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: bold;
  min-height: 32px;

  &:hover {
    background: #16a34a;
  }
`;

export const DismissButton = styled.button`
  background: none;
  border: 1px solid #4a6090;
  color: #cce0ff;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: inherit;
  min-height: 32px;

  &:hover {
    border-color: #88bbee;
    color: #fff;
  }
`;
