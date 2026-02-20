import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const FieldWrapper = styled.div`
  position: relative;
  overflow: hidden;
  height: 280px;
  width: 100%;
  flex-shrink: 0;
  /* Green background fills the full container so no black void shows on wide screens */
  background: #aac32b;

  ${mq.mobile} {
    height: 100%;
    /*
     * 210px ensures the rotated OutfieldDiv is fully contained.
     * The 140×140 square rotated 45° has a bounding box of ≈ 198×198px.
     * With the element centred at y=100px (top: 30px + half-height 70px),
     * the bounding box spans y ≈ 1px to 199px — safely within 210px.
     */
    min-height: 210px;
  }
`;

export const OutfieldDiv = styled.div`
  height: 300px;
  width: 300px;
  background: #aac32b;
  border-radius: 100% 0 0 0;
  position: absolute;
  right: 0;
  bottom: 65px;
  transform: rotate(45deg);

  ${mq.mobile} {
    height: 140px;
    width: 140px;
    /*
     * top: 30px shifts the element down so the bounding box of the rotated
     * square (≈ ±99px from its centre) starts at ~1px inside FieldWrapper.
     * Without this offset the rotation pushes ~57px of the element above the
     * top edge where overflow: hidden clips it.
     * translateY(-20%) was removed for the same reason.
     */
    top: 30px;
    right: auto;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
  }
`;

export const DiamondDiv = styled.div`
  background: #886c36;
  height: 150px;
  width: 150px;
  position: absolute;
  bottom: 0;
  right: 0;

  ${mq.mobile} {
    height: 70px;
    width: 70px;
  }
`;

export const Mound = styled.div`
  height: 100px;
  width: 100px;
  background: #aac32b;
  position: absolute;
  left: calc(50% - 50px);
  top: calc(50% - 50px);

  &:after {
    display: block;
    content: "";
    position: absolute;
    height: 50px;
    width: 50px;
    border-radius: 100%;
    background: #886c36;
    left: calc(50% - 25px);
    top: calc(50% - 25px);
  }

  ${mq.mobile} {
    height: 46px;
    width: 46px;
    left: calc(50% - 23px);
    top: calc(50% - 23px);

    &:after {
      height: 23px;
      width: 23px;
      left: calc(50% - 12px);
      top: calc(50% - 12px);
    }
  }
`;

export const BaseDiv = styled.div<{ $playerOnBase?: boolean; $isHome?: boolean; $base: number }>`
  background: ${({ $playerOnBase, $isHome }) =>
    $playerOnBase ? "#3f4f7e" : $isHome ? "#fff" : "#ff21b1"};
  height: 10px;
  width: 10px;
  position: absolute;
  right: ${({ $base }) => ($base === 1 || $base === 0 ? 0 : null)};
  bottom: ${({ $base }) => ($base === 3 || $base === 0 ? 0 : null)};
  left: ${({ $base }) => ($base === 2 ? 0 : null)};
`;
