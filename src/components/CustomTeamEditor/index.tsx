import * as React from "react";

import { generateDefaultCustomTeamDraft } from "@features/customTeams/generation/generateDefaultTeam";

import { useCustomTeams } from "@hooks/useCustomTeams";
import type { CustomTeamDoc } from "@storage/types";

import {
  editorReducer,
  editorStateToCreateInput,
  initEditorState,
  makePlayerId,
  validateEditorState,
} from "./editorState";
import PlayerRow from "./PlayerRow";
import {
  AddPlayerBtn,
  ButtonRow,
  CancelBtn,
  EditorContainer,
  EditorTitle,
  ErrorMsg,
  FieldGroup,
  FieldLabel,
  FieldRow,
  FormSection,
  GenerateBtn,
  SaveBtn,
  SectionHeading,
  TextInput,
} from "./styles";

type Props = {
  /** Existing team to edit. Undefined means create-new mode. */
  team?: CustomTeamDoc;
  onSave: (id: string) => void;
  onCancel: () => void;
};

const makeBlankBatter = () => ({
  id: makePlayerId(),
  name: "",
  contact: 60,
  power: 60,
  speed: 60,
});

const makeBlankPitcher = () => ({
  id: makePlayerId(),
  name: "",
  contact: 35,
  power: 35,
  speed: 35,
  velocity: 60,
  control: 60,
  movement: 60,
});

const CustomTeamEditor: React.FunctionComponent<Props> = ({ team, onSave, onCancel }) => {
  const [state, dispatch] = React.useReducer(editorReducer, team, initEditorState);
  const { createTeam, updateTeam } = useCustomTeams();

  const handleGenerate = () => {
    const seed = `${Date.now()}`;
    dispatch({ type: "APPLY_DRAFT", draft: generateDefaultCustomTeamDraft(seed) });
  };

  const handleSave = async () => {
    const err = validateEditorState(state);
    if (err) {
      dispatch({ type: "SET_ERROR", error: err });
      return;
    }
    try {
      const input = editorStateToCreateInput(state);
      if (team) {
        await updateTeam(team.id, {
          name: input.name,
          city: input.city,
          nickname: input.nickname,
          roster: input.roster,
        });
        onSave(team.id);
      } else {
        const id = await createTeam(input);
        onSave(id);
      }
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "Save failed." });
    }
  };

  const section = (
    key: "lineup" | "bench" | "pitchers",
    label: string,
    testId: string,
    addTestId: string,
    isPitcher = false,
  ) => (
    <FormSection data-testid={testId}>
      <SectionHeading>{label}</SectionHeading>
      {state[key].map((p, i) => (
        <PlayerRow
          key={p.id}
          player={p}
          index={i}
          total={state[key].length}
          isPitcher={isPitcher}
          onChange={(patch) =>
            dispatch({ type: "UPDATE_PLAYER", section: key, index: i, player: patch })
          }
          onRemove={() => dispatch({ type: "REMOVE_PLAYER", section: key, index: i })}
          onMoveUp={() => dispatch({ type: "MOVE_UP", section: key, index: i })}
          onMoveDown={() => dispatch({ type: "MOVE_DOWN", section: key, index: i })}
        />
      ))}
      <AddPlayerBtn
        type="button"
        data-testid={addTestId}
        onClick={() =>
          dispatch({
            type: "ADD_PLAYER",
            section: key,
            player: isPitcher ? makeBlankPitcher() : makeBlankBatter(),
          })
        }
      >
        + Add {isPitcher ? "Pitcher" : "Player"}
      </AddPlayerBtn>
    </FormSection>
  );

  return (
    <EditorContainer>
      <EditorTitle>{team ? "Edit Team" : "Create Team"}</EditorTitle>

      <FormSection>
        <SectionHeading>Team Info</SectionHeading>
        <FieldRow>
          <FieldGroup $flex={2}>
            <FieldLabel htmlFor="ct-name">Team Name *</FieldLabel>
            <TextInput
              id="ct-name"
              value={state.name}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "name", value: e.target.value })
              }
              placeholder="e.g. Eagles"
              aria-invalid={!state.name.trim() && !!state.error ? "true" : undefined}
              data-testid="custom-team-name-input"
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="ct-city">City</FieldLabel>
            <TextInput
              id="ct-city"
              value={state.city}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "city", value: e.target.value })
              }
              placeholder="e.g. Austin"
              data-testid="custom-team-city-input"
            />
          </FieldGroup>
        </FieldRow>
        <GenerateBtn
          type="button"
          onClick={handleGenerate}
          data-testid="custom-team-regenerate-defaults-button"
        >
          ✨ Generate Defaults
        </GenerateBtn>
      </FormSection>

      {state.error && <ErrorMsg role="alert">{state.error}</ErrorMsg>}

      {section(
        "lineup",
        "Lineup",
        "custom-team-lineup-section",
        "custom-team-add-lineup-player-button",
      )}
      {section(
        "bench",
        "Bench",
        "custom-team-bench-section",
        "custom-team-add-bench-player-button",
      )}
      {section(
        "pitchers",
        "Pitchers",
        "custom-team-pitchers-section",
        "custom-team-add-pitcher-button",
        true,
      )}

      <ButtonRow>
        <SaveBtn type="button" onClick={handleSave} data-testid="custom-team-save-button">
          Save Team
        </SaveBtn>
        <CancelBtn type="button" onClick={onCancel} data-testid="custom-team-cancel-button">
          Cancel
        </CancelBtn>
      </ButtonRow>
    </EditorContainer>
  );
};

export default CustomTeamEditor;
