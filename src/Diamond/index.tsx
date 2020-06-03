import * as React  from "react";

import styled from "styled-components";
import { GameContext } from "../Context";

const DiamondDiv = styled.div`
  background: #AAC32B;
  height: 100px;
  width: 100px;
  transform: rotate(45deg); /* Equal to rotateZ(45deg) */
  position: absolute;
  right: 55px;
  bottom: 55px;
`;

const BaseDiv = styled.div`
  background: #b11c1c;
  height: 10px;
  width: 10px;
  position: absolute;
  right: ${({ base }) => base === 1 || base === 0 ? 0 : null};
  bottom: ${({ base }) => base === 3 || base === 0 ? 0 : null};
  left: ${({ base }) => base === 2 ? 0 : null};
`;

const Diamond: React.FunctionComponent<{}> = () => {
  const { dispatch, ...state } = React.useContext(GameContext);

  console.log(state);

  global.dispatch = dispatch;

  return (
    <DiamondDiv>
      <BaseDiv base={0} /> { /* home */ }
      <BaseDiv base={1} /> {/* first */}
      <BaseDiv base={2} /> {/* second */}
      <BaseDiv base={3} /> {/* third */}
    </DiamondDiv>
  );
}

export default Diamond;
