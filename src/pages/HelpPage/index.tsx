import * as React from "react";

import { useNavigate } from "react-router";

import HelpContent from "@components/HelpContent";

import { BackBtn, PageContainer, PageHeader, PageTitle } from "./styles";

/**
 * Standalone help page — renders the same content as InstructionsModal
 * but as a full page accessible from Home without starting a game.
 * InstructionsModal is left unchanged (still used in-game as a dialog).
 */

const HelpPage: React.FunctionComponent = () => {
  const navigate = useNavigate();

  return (
    <PageContainer data-testid="help-page">
      <PageHeader>
        <BackBtn
          type="button"
          onClick={() => navigate("/")}
          data-testid="help-page-back-button"
          aria-label="Go back"
        >
          ← Back
        </BackBtn>
      </PageHeader>

      <PageTitle>⚾ How to Play</PageTitle>

      <HelpContent />
    </PageContainer>
  );
};

export default HelpPage;
