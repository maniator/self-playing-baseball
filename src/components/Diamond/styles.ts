import styled from "styled-components";

export const FieldWrapper = styled.div`
  position: relative;
  overflow: hidden;
  height: 280px;
  width: 100%;
  flex-shrink: 0;

  @media (max-width: 800px) {
    height: 200px;
    flex: 1;
  }
`;

export const OutfieldDiv = styled.div`
  height: 300px;
  width: 300px;
  background: #AAC32B;
  border-radius: 100% 0 0 0;
  position: absolute;
  right: 0;
  bottom: 65px;
  transform: rotate(45deg);

  @media (max-width: 800px) {
    height: 160px;
    width: 160px;
    bottom: 30px;
  }
`;

export const DiamondDiv = styled.div`
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

export const Mound = styled.div`
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

export const BaseDiv = styled.div<{ $playerOnBase?: boolean; $isHome?: boolean; $base: number }>`
  background: ${({ $playerOnBase, $isHome }) => $playerOnBase ? "#3f4f7e" : $isHome ? "#fff" : "#ff21b1"};
  height: 10px;
  width: 10px;
  position: absolute;
  right: ${({ $base }) => $base === 1 || $base === 0 ? 0 : null};
  bottom: ${({ $base }) => $base === 3 || $base === 0 ? 0 : null};
  left: ${({ $base }) => $base === 2 ? 0 : null};
`;
