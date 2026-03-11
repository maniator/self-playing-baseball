import styled from "styled-components";

export const Tabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.s6};
`;

export const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  background: ${({ $active, theme }) => ($active ? theme.colors.bgInput : "transparent")};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.textNavDim : theme.colors.borderLog)};
  color: ${({ $active, theme }) => ($active ? theme.colors.textBodyAlt : theme.colors.textDimmer)};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => theme.spacing.s3} ${({ theme }) => theme.spacing.s6};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  cursor: pointer;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;
