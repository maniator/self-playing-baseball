import * as React  from "react";

import styled from "styled-components";
import { GameContext } from "../Context";
import Announcements from "../Announcements";
import Ball from "../Ball";

const OutfieldDiv = styled.div`
  height: 300px;
  width: 300px;
  background: #AAC32B;
  border-radius: 100% 0 0 0;
  position: absolute;
  right: 35px;
  bottom: 75px;
  transform: rotate(45deg); /* Equal to rotateZ(45deg) */
  z-index: -1;

  @media (max-width: 600px) {
    position: static;
    transform: rotate(45deg);
    margin: 20px auto;
    height: 180px;
    width: 180px;
  }
`;

const DiamondDiv = styled.div`
  background: #886c36;
  height: 150px;
  width: 150px;
  position: absolute;
  bottom: 0;
  right: 0;
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
`;

const BaseDiv = styled.div`
  background: ${({ playerOnBase, isHome }) => playerOnBase ? "#3f4f7e" : isHome ? "#fff" : "#ff21b1"};
  height: 10px;
  width: 10px;
  position: absolute;
  right: ${({ base }) => base === 1 || base === 0 ? 0 : null};
  bottom: ${({ base }) => base === 3 || base === 0 ? 0 : null};
  left: ${({ base }) => base === 2 ? 0 : null};
`;

const Diamond: React.FunctionComponent<{}> = () => {
  const { dispatch, ...state } = React.useContext(GameContext);
  const [ first, second, third ] = state.baseLayout;

  return (
    <OutfieldDiv>

      <DiamondDiv>
        <Mound />
        <BaseDiv base={0} isHome /> { /* home */ }
        <BaseDiv base={1} playerOnBase={Boolean(first)} /> {/* first */}
        <BaseDiv base={2} playerOnBase={Boolean(second)} /> {/* second */}
        <BaseDiv base={3} playerOnBase={Boolean(third)} /> {/* third */}

        <Ball />
      </DiamondDiv>
    </OutfieldDiv>
  );
}

export default Diamond;
