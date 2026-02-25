import * as React from "react";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { generateDefaultCustomTeamDraft } from "@features/customTeams/generation/generateDefaultTeam";

import { useCustomTeams } from "@hooks/useCustomTeams";
import type { CustomTeamDoc } from "@storage/types";
import { getSeed } from "@utils/rng";

import {
  type EditorPlayer,
  editorReducer,
  editorStateToCreateInput,
  initEditorState,
  makePlayerId,
  validateEditorState,
} from "./editorState";
import PlayerRow from "./PlayerRow";
import SortablePlayerRow from "./SortablePlayerRow";
import {
  AddPlayerBtn,
  ButtonRow,
  CancelBtn,
  EditorContainer,
  EditorTitle,
  ErrorMsg,
  FieldGroup,
  FieldLabel,
  FormSection,
  GenerateBtn,
  SaveBtn,
  SectionHeading,
  TeamInfoGrid,
  TeamInfoSecondRow,
  TextInput,
} from "./styles";

type Props = {
  /** Existing team to edit. Undefined means create-new mode. */
  team?: CustomTeamDoc;
  onSave: (id: string) => void;
  onCancel: () => void;
};

const makeBlankBatter = (): EditorPlayer => ({
  id: makePlayerId(),
  name: "",
  position: "",
  handedness: "R",
  contact: 60,
  power: 60,
  speed: 60,
});

const makeBlankPitcher = (): EditorPlayer => ({
  id: makePlayerId(),
  name: "",
  position: "",
  handedness: "R",
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
  const errorRef = React.useRef<HTMLParagraphElement>(null);
  // Incremented each time Generate Defaults is clicked, so consecutive presses
  // produce different (but reproducible) rosters.  The counter starts at 0 on
  // every component mount, ensuring E2E/visual snapshot tests always get the
  // same output on their first click.
  const [draftCount, setDraftCount] = React.useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLineupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.lineup.findIndex((p) => p.id === active.id);
    const newIndex = state.lineup.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(state.lineup, oldIndex, newIndex);
    dispatch({ type: "REORDER", section: "lineup", orderedIds: reordered.map((p) => p.id) });
  };

  const handleGenerate = () => {
    // Mix the current game seed (from the app-level deterministic PRNG) with a
    // per-mount counter so the output is reproducible in tests that navigate
    // with a fixed ?seed= URL, while still varying across consecutive presses.
    const seed = ((getSeed() ?? 0) ^ draftCount) >>> 0;
    setDraftCount((c) => c + 1);
    dispatch({ type: "APPLY_DRAFT", draft: generateDefaultCustomTeamDraft(seed) });
  };

  const handleSave = async () => {
    const err = validateEditorState(state);
    if (err) {
      dispatch({ type: "SET_ERROR", error: err });
      // Scroll to and focus the error summary so it is immediately visible
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        errorRef.current?.focus();
      }, 0);
      return;
    }
    try {
      const input = editorStateToCreateInput(state);
      if (team) {
        await updateTeam(team.id, {
          name: input.name,
          abbreviation: input.abbreviation,
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
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        errorRef.current?.focus();
      }, 0);
    }
  };

  /** DnD-enabled lineup section. */
  const lineupSection = () => (
    <FormSection data-testid="custom-team-lineup-section">
      <SectionHeading>Lineup (drag to reorder)</SectionHeading>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleLineupDragEnd}
      >
        <SortableContext
          items={state.lineup.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {state.lineup.map((p, i) => (
            <SortablePlayerRow
              key={p.id}
              player={p}
              onChange={(patch) =>
                dispatch({ type: "UPDATE_PLAYER", section: "lineup", index: i, player: patch })
              }
              onRemove={() => dispatch({ type: "REMOVE_PLAYER", section: "lineup", index: i })}
            />
          ))}
        </SortableContext>
      </DndContext>
      <AddPlayerBtn
        type="button"
        data-testid="custom-team-add-lineup-player-button"
        onClick={() =>
          dispatch({ type: "ADD_PLAYER", section: "lineup", player: makeBlankBatter() })
        }
      >
        + Add Player
      </AddPlayerBtn>
    </FormSection>
  );

  /** Plain up/down section for bench and pitchers. */
  const plainSection = (
    key: "bench" | "pitchers",
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
        <TeamInfoGrid>
          <FieldGroup>
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
          <TeamInfoSecondRow>
            <FieldGroup>
              <FieldLabel htmlFor="ct-abbrev">Abbrev * (2–3 chars)</FieldLabel>
              <TextInput
                id="ct-abbrev"
                value={state.abbreviation}
                onChange={(e) =>
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
          </TeamInfoSecondRow>
        </TeamInfoGrid>
        <GenerateBtn
          type="button"
          onClick={handleGenerate}
          data-testid="custom-team-regenerate-defaults-button"
        >
          ✨ Generate Defaults
        </GenerateBtn>
      </FormSection>

      {state.error && (
        <ErrorMsg
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          data-testid="custom-team-editor-error-summary"
        >
          {state.error}
        </ErrorMsg>
      )}

      {lineupSection()}
      {plainSection(
        "bench",
        "Bench",
        "custom-team-bench-section",
        "custom-team-add-bench-player-button",
      )}
      {plainSection(
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
      {state.error && (
        <ErrorMsg role="presentation" aria-hidden="true" data-testid="custom-team-save-error-hint">
          {state.error}
        </ErrorMsg>
      )}
    </EditorContainer>
  );
};

export default CustomTeamEditor;
