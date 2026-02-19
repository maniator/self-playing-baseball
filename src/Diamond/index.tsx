import * as React from "react";
import { useGameContext } from "../Context";
import Ball from "../Ball";
import { FieldWrapper, OutfieldDiv, DiamondDiv, Mound, BaseDiv } from "./styles";

const Diamond: React.FunctionComponent<{}> = () => {
  const { baseLayout } = useGameContext();
  const [first, second, third] = baseLayout;

  return (
    <FieldWrapper>
      <OutfieldDiv>
        <DiamondDiv>
          <Mound />
          <BaseDiv $base={0} $isHome />
          <BaseDiv $base={1} $playerOnBase={Boolean(first)} />
          <BaseDiv $base={2} $playerOnBase={Boolean(second)} />
          <BaseDiv $base={3} $playerOnBase={Boolean(third)} />

          <Ball />
        </DiamondDiv>
      </OutfieldDiv>
    </FieldWrapper>
  );
};

export default Diamond;
