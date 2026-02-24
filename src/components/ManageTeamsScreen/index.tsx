import * as React from "react";

import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 32px 24px;
  gap: 20px;
`;

const Title = styled.h1`
  color: white;
  font-size: 2rem;
  margin: 0;
`;

const Message = styled.p`
  color: #888;
  font-size: 1rem;
  text-align: center;
  max-width: 360px;
  margin: 0;
`;

const BackBtn = styled.button`
  background: transparent;
  color: #bbb;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 12px 20px;
  font-size: 0.95rem;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: #111;
    border-color: #666;
    color: #ddd;
  }
`;

type Props = {
  onBack: () => void;
};

const ManageTeamsScreen: React.FunctionComponent<Props> = ({ onBack }) => (
  <Container data-testid="manage-teams-screen">
    <Title>🏟️ Manage Teams</Title>
    <Message>Custom team management is coming soon. Check back in the next stage!</Message>
    <BackBtn onClick={onBack} data-testid="manage-teams-back-button">
      ← Back to Home
    </BackBtn>
  </Container>
);

export default ManageTeamsScreen;
