import * as React  from "react";

import styled, { keyframes } from "styled-components";
import { Hit } from "../constants/hitTypes";
import { ContextValue, GameContext } from "../Context";

const hitLengths = {
  [Hit.Homerun]: 1000,
  [Hit.Single]: 250,
  [Hit.Double]: 500,
  [Hit.Triple]: 750
}

const rotate = ({ hit }) => keyframes`
  from {
    transform: rotate(0deg)
    translate(0)
    rotate(0deg);
  }
  to {
    transform: rotate(180deg)
    translate(-${hitLengths[hit]}px)
    rotate(-180deg);
  }
`

const Baseball = styled.div`
  animation: ${rotate} 3s normal ease-in;
  display: block;
  position: absolute;
  background: #FFFFFF;
  border-radius: 100%;
  width: 10px;
  height: 10px;
  bottom: 0;
  right: 0;
  content: "";
`;

const Ball: React.FunctionComponent<{}> = () => {
  const { hitType }: ContextValue = React.useContext(GameContext);

  return (
    <Baseball hit={hitType} />
  );
}

export default Ball;
