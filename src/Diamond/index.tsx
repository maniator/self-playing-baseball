import * as React from "react";

import styled from "styled-components";
import { GameContext } from "../Context";
import Ball from "../Ball";

const OutfieldDiv = styled.div`
  height: 300px;
  width: 300px;
  background: #AAC32B;
  border-radius: 100% 0 0 0;
  position: absolute;
  right: 35px;
  bottom: 75px;
  transform: rotate(45deg);
  z-index: -1;

  @media (max-width: 800px) {
    position: relative;
    right: auto;
    bottom: auto;
    height: 160px;
    width: 160px;
    margin: 0;
    transform: rotate(45deg);
    flex-shrink: 0;
    z-index: 0;
  }
`;

const DiamondDiv = styled.div`
  background: #886c36;
  height: 150px;
  width: 150px;
  position: absolute;
  bottom: 0;
  right: 0;

  @media (max-width: 800px) {
    height: 80px;
    width: 80px;
  }
`;

const Mound = styled.div`
  height: 100px;
  width: 100px;
  background: #AAC32B;
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

  @media (max-width: 800px) {
    height: 53px;
    width: 53px;
    left: calc(50% - 27px);
    top: calc(50% - 27px);

    &:after {
      height: 27px;
      width: 27px;
      left: calc(50% - 14px);
      top: calc(50% - 14px);
    }
  }
`;

const BaseDiv = styled.div<{ playerOnBase?: boolean; isHome?: boolean; base: number }>`
  background: ${({ playerOnBase, isHome }) => playerOnBase ? "#3f4f7e" : isHome ? "#fff" : "#ff21b1"};
  height: 10px;
  width: 10px;
  position: absolute;
  right: ${({ base }) => base === 1 || base === 0 ? 0 : null};
  bottom: ${({ base }) => base === 3 || base === 0 ? 0 : null};
  left: ${({ base }) => base === 2 ? 0 : null};
`;

const Diamond: React.FunctionComponent<{}> = () => {
  const { ...state } = React.useContext(GameContext);
  const [first, second, third] = state.baseLayout;

  return (
    <OutfieldDiv>
      <DiamondDiv>
        <Mound />
        <BaseDiv base={0} isHome />
        <BaseDiv base={1} playerOnBase={Boolean(first)} />
        <BaseDiv base={2} playerOnBase={Boolean(second)} />
        <BaseDiv base={3} playerOnBase={Boolean(third)} />

        <Ball />
      </DiamondDiv>
    </OutfieldDiv>
  );
};

export default Diamond;
