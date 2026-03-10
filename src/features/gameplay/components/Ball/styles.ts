import styled, { css, keyframes } from "styled-components";

// Pitch animation: ball travels from the pitcher's mound toward home plate, then fades.
export const pitchAnim = keyframes`
  0%   { transform: translate(-55px, -55px) scale(0.55); opacity: 0.7; }
  70%  { transform: translate(0, 0) scale(1);            opacity: 1;   }
  100% { transform: translate(0, 0) scale(1);            opacity: 0;   }
`;

// Hit animation: ball flies away from home plate toward the outfield.
export const makeHitAnim = (dist: number) => keyframes`
  0%   { transform: translate(0, 0) scale(1);                      opacity: 1; }
  80%  { transform: translate(-${dist}px, -${dist}px) scale(0.4);  opacity: 1; }
  100% { transform: translate(-${dist}px, -${dist}px) scale(0.2);  opacity: 0; }
`;

export const Baseball = styled.div<{ $isHit: boolean; $dist: number }>`
  display: block;
  position: absolute;
  background: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 100%;
  width: 10px;
  height: 10px;
  bottom: 0;
  right: 0;
  ${({ $isHit, $dist }) =>
    $isHit
      ? css`
          animation: ${makeHitAnim($dist)} 1.4s ease-out forwards;
        `
      : css`
          animation: ${pitchAnim} 0.9s ease-in forwards;
        `}
`;
