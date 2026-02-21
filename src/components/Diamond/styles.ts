import styled from "styled-components";

import { mq } from "@utils/mediaQueries";

export const FieldWrapper = styled.div`
  position: relative;
  overflow: hidden;
  height: 280px;
  width: 100%;
  flex-shrink: 0;

  ${mq.mobile} {
    flex: 1;
    height: auto;
  }
`;

export const OutfieldDiv = styled.div`
  height: 300px;
  width: 300px;
  background: #aac32b;
  border-radius: 100% 0 0 0;
  position: absolute;
  /* Centre the field horizontally so it doesn't hug one edge in wide containers */
  left: 50%;
  bottom: 65px;
  transform: translateX(-50%) rotate(45deg);

  ${mq.mobile} {
    /*
     * --mobile-field scales the whole field with the viewport width and is
     * inherited by DiamondDiv, Mound, and their children via CSS cascade.
     * At 320 px → 189 px; 375 px → 221 px; 414 px → 244 px; capped at 260 px.
     */
    --mobile-field: min(59vw, 260px);
    height: var(--mobile-field);
    width: var(--mobile-field);
    top: 0;
    bottom: auto;
    transform: translateX(-50%) translateY(-20%) rotate(45deg);
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
    /* 50% of OutfieldDiv — same ratio as desktop (150/300) */
    height: calc(var(--mobile-field, 140px) / 2);
    width: calc(var(--mobile-field, 140px) / 2);
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
    /* ~1/3 of OutfieldDiv — same ratio as desktop (100/300) */
    height: calc(var(--mobile-field, 140px) / 3);
    width: calc(var(--mobile-field, 140px) / 3);
    left: calc(50% - var(--mobile-field, 140px) / 6);
    top: calc(50% - var(--mobile-field, 140px) / 6);

    &:after {
      /* ~1/6 of OutfieldDiv — same ratio as desktop (50/300) */
      height: calc(var(--mobile-field, 140px) / 6);
      width: calc(var(--mobile-field, 140px) / 6);
      left: calc(50% - var(--mobile-field, 140px) / 12);
      top: calc(50% - var(--mobile-field, 140px) / 12);
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
