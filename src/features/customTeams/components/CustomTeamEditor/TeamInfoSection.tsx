import * as React from "react";

import { generateDefaultCustomTeamDraft } from "@feat/customTeams/generation/generateDefaultTeam";

import type { EditorAction, EditorState } from "./editorState";
import {
  FieldGroup,
  FieldHint,
  FieldLabel,
  FormSection,
  GenerateBtn,
  IdentityLockHint,
  ReadOnlyInput,
  SectionHeading,
  TeamInfoGrid,
  TeamInfoSecondRow,
  TextInput,
} from "./styles";

// Module-level counter seeded from the current timestamp so each page load
// produces different defaults, and successive Generate clicks differ within a session.
let _generateCounter = Date.now() | 0;

type Props = {
  state: EditorState;
  isEditMode: boolean;
  dispatch: React.Dispatch<EditorAction>;
};

export const TeamInfoSection: React.FunctionComponent<Props> = ({
  state,
  isEditMode,
  dispatch,
}) => {
  const handleGenerate = () => {
    dispatch({ type: "APPLY_DRAFT", draft: generateDefaultCustomTeamDraft(++_generateCounter) });
  };

  const cityTrimmed = state.city.trim();
  const nameTrimmed = state.name.trim();

  return (
    <FormSection>
      <SectionHeading>Team Info</SectionHeading>
      <TeamInfoGrid>
        <FieldGroup>
          <FieldLabel htmlFor="ct-name">Team Name *</FieldLabel>
          {isEditMode ? (
            <ReadOnlyInput
              id="ct-name"
              value={state.name}
              disabled
              data-testid="custom-team-name-input"
            />
          ) : (
            <>
              <TextInput
                id="ct-name"
                value={state.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dispatch({ type: "SET_FIELD", field: "name", value: e.target.value })
                }
                placeholder="e.g. Eagles"
                aria-invalid={!state.name.trim() && !!state.error ? "true" : undefined}
                data-testid="custom-team-name-input"
              />
              <FieldHint>
                Short name only — displayed as{" "}
                {cityTrimmed || nameTrimmed ? (
                  <strong>
                    {cityTrimmed ? `${cityTrimmed} ` : ""}
                    {nameTrimmed || "…"}
                  </strong>
                ) : (
                  <strong>City Name</strong>
                )}{" "}
                (e.g. Austin Eagles)
              </FieldHint>
            </>
          )}
        </FieldGroup>
        <TeamInfoSecondRow>
          <FieldGroup>
            <FieldLabel htmlFor="ct-abbrev">Abbrev * (2–3 chars)</FieldLabel>
            {isEditMode ? (
              <ReadOnlyInput
                id="ct-abbrev"
                value={state.abbreviation}
                disabled
                data-testid="custom-team-abbreviation-input"
              />
            ) : (
              <TextInput
                id="ct-abbrev"
                value={state.abbreviation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "abbreviation",
                    value: e.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g. EAG"
                maxLength={3}
                aria-invalid={
                  !!state.error &&
                  (!state.abbreviation.trim() ||
                    state.abbreviation.trim().length < 2 ||
                    state.abbreviation.trim().length > 3)
                    ? "true"
                    : undefined
                }
                data-testid="custom-team-abbreviation-input"
              />
            )}
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="ct-city">City</FieldLabel>
            {isEditMode ? (
              <ReadOnlyInput
                id="ct-city"
                value={state.city}
                disabled
                data-testid="custom-team-city-input"
              />
            ) : (
              <TextInput
                id="ct-city"
                value={state.city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  dispatch({ type: "SET_FIELD", field: "city", value: e.target.value })
                }
                placeholder="e.g. Austin"
                data-testid="custom-team-city-input"
              />
            )}
          </FieldGroup>
        </TeamInfoSecondRow>
      </TeamInfoGrid>
      {isEditMode && (
        <IdentityLockHint>
          🔒 Team identity fields and player names are locked after creation.
        </IdentityLockHint>
      )}
      {!isEditMode && (
        <GenerateBtn
          type="button"
          onClick={handleGenerate}
          data-testid="custom-team-regenerate-defaults-button"
        >
          ✨ Generate Random
        </GenerateBtn>
      )}
    </FormSection>
  );
};
