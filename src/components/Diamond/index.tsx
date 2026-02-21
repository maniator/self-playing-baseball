import * as React from "react";

import Ball from "@components/Ball";
import { useGameContext } from "@context/index";

import { BaseDiv, DiamondDiv, FieldWrapper, Mound, OutfieldDiv } from "./styles";

const Diamond: React.FunctionComponent = () => {
  const { baseLayout } = useGameContext();
  const [first, second, third] = baseLayout;

  return (
    <FieldWrapper data-testid="field">
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
