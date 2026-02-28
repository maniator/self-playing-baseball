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
import {
  buildPlayerSig,
  exportCustomPlayer,
  parseExportedCustomPlayer,
} from "@storage/customTeamExportImport";
import { generateSeed } from "@storage/generateId";
import { downloadJson, playerFilename } from "@storage/saveIO";
import type { CustomTeamDoc, TeamPlayer } from "@storage/types";

import {
  type EditorAction,
  type EditorPlayer,
  editorPlayerToTeamPlayer,
  editorReducer,
  editorStateToCreateInput,
  initEditorState,
  makePlayerId,
  validateEditorState,
} from "./editorState";
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
  IdentityLockHint,
  ImportPlayerBtn,
  PlayerDuplicateActions,
  PlayerDuplicateBanner,
  ReadOnlyInput,
  SaveBtn,
  SectionHeading,
  SmallIconBtn,
  TeamInfoGrid,
  TeamInfoSecondRow,
  TextInput,
} from "./styles";

// The counter is seeded from the current timestamp on module load so that
// each fresh page load produces different teams when "Generate Random" is clicked.
// The counter increments on every click, so successive clicks in the same session
// also produce distinct rosters.  Visual snapshot tests that need deterministic
// output should call generateDefaultCustomTeamDraft() directly with a fixed seed
// rather than going through the UI button.
let _generateCounter = Date.now() | 0;

type Props = {
  /** Existing team to edit. Undefined means create-new mode. */
  team?: CustomTeamDoc;
  onSave: (id: string) => void;
  onCancel: () => void;
};

const makeBlankBatter = (): EditorPlayer => ({
  id: makePlayerId(),
  playerSeed: generateSeed(),
  name: "",
  position: "",
  handedness: "R",
  contact: 60,
  power: 60,
  speed: 60,
});

const makeBlankPitcher = (): EditorPlayer => ({
  id: makePlayerId(),
  playerSeed: generateSeed(),
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

// ── Shared types for section sub-components ────────────────────────────────────

type PendingPlayerImport = {
  player: EditorPlayer;
  section: "lineup" | "bench" | "pitchers";
  warning: string;
};

type EditorDispatch = React.Dispatch<EditorAction>;

// ── LineupFormSection ──────────────────────────────────────────────────────────

type LineupFormSectionProps = {
  lineup: EditorPlayer[];
  existingPlayerIds: Set<string>;
  pendingPlayerImport: PendingPlayerImport | null;
  dispatch: EditorDispatch;
  setPendingPlayerImport: React.Dispatch<React.SetStateAction<PendingPlayerImport | null>>;
  lineupFileRef: React.RefObject<HTMLInputElement>;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportPlayer: (p: EditorPlayer, role: "batter" | "pitcher") => void;
};

/** DnD-enabled lineup section (shares DndContext with bench). */
const LineupFormSection: React.FunctionComponent<LineupFormSectionProps> = ({
  lineup,
  existingPlayerIds,
  pendingPlayerImport,
  dispatch,
  setPendingPlayerImport,
  lineupFileRef,
  onImportFile,
  handleExportPlayer,
}) => (
  <FormSection data-testid="custom-team-lineup-section">
    <SectionHeading>Lineup (drag to reorder; drag to/from Bench)</SectionHeading>
    {pendingPlayerImport?.section === "lineup" && (
      <PlayerDuplicateBanner role="alert" data-testid="player-import-lineup-duplicate-banner">
        ⚠ {pendingPlayerImport.warning}
        <PlayerDuplicateActions>
          <SmallIconBtn
            type="button"
            data-testid="player-import-lineup-confirm-button"
            onClick={() => {
              dispatch({
                type: "ADD_PLAYER",
                section: "lineup",
                player: pendingPlayerImport.player,
              });
              setPendingPlayerImport(null);
            }}
          >
            Import Anyway
          </SmallIconBtn>
          <SmallIconBtn type="button" onClick={() => setPendingPlayerImport(null)}>
            Cancel
          </SmallIconBtn>
        </PlayerDuplicateActions>
      </PlayerDuplicateBanner>
    )}
    <SortableContext items={lineup.map((p) => p.id)} strategy={verticalListSortingStrategy}>
      {lineup.map((p, i) => (
        <SortablePlayerRow
          key={p.id}
          player={p}
          isExistingPlayer={existingPlayerIds.has(p.id)}
          onChange={(patch) =>
            dispatch({ type: "UPDATE_PLAYER", section: "lineup", index: i, player: patch })
          }
          onRemove={() => dispatch({ type: "REMOVE_PLAYER", section: "lineup", index: i })}
          onExport={() => handleExportPlayer(p, "batter")}
        />
      ))}
    </SortableContext>
    <AddPlayerBtn
      type="button"
      data-testid="custom-team-add-lineup-player-button"
      onClick={() => dispatch({ type: "ADD_PLAYER", section: "lineup", player: makeBlankBatter() })}
    >
      + Add Player
    </AddPlayerBtn>
    <input
      ref={lineupFileRef}
      type="file"
      accept=".json"
      style={{ display: "none" }}
      onChange={onImportFile}
      data-testid="import-lineup-player-input"
      aria-label="Import lineup player from file"
    />
    <ImportPlayerBtn type="button" onClick={() => lineupFileRef.current?.click()}>
      ↑ Import Player
    </ImportPlayerBtn>
  </FormSection>
);

// ── BenchFormSection ───────────────────────────────────────────────────────────

type BenchFormSectionProps = {
  bench: EditorPlayer[];
  existingPlayerIds: Set<string>;
  pendingPlayerImport: PendingPlayerImport | null;
  dispatch: EditorDispatch;
  setPendingPlayerImport: React.Dispatch<React.SetStateAction<PendingPlayerImport | null>>;
  benchFileRef: React.RefObject<HTMLInputElement>;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportPlayer: (p: EditorPlayer, role: "batter" | "pitcher") => void;
};

/** DnD-enabled bench section (shares DndContext with lineup). */
const BenchFormSection: React.FunctionComponent<BenchFormSectionProps> = ({
  bench,
  existingPlayerIds,
  pendingPlayerImport,
  dispatch,
  setPendingPlayerImport,
  benchFileRef,
  onImportFile,
  handleExportPlayer,
}) => (
  <FormSection data-testid="custom-team-bench-section">
    <SectionHeading>Bench (drag to reorder; drag to/from Lineup)</SectionHeading>
    {pendingPlayerImport?.section === "bench" && (
      <PlayerDuplicateBanner role="alert" data-testid="player-import-bench-duplicate-banner">
        ⚠ {pendingPlayerImport.warning}
        <PlayerDuplicateActions>
          <SmallIconBtn
            type="button"
            data-testid="player-import-bench-confirm-button"
            onClick={() => {
              dispatch({
                type: "ADD_PLAYER",
                section: "bench",
                player: pendingPlayerImport.player,
              });
              setPendingPlayerImport(null);
            }}
          >
            Import Anyway
          </SmallIconBtn>
          <SmallIconBtn type="button" onClick={() => setPendingPlayerImport(null)}>
            Cancel
          </SmallIconBtn>
        </PlayerDuplicateActions>
      </PlayerDuplicateBanner>
    )}
    <SortableContext items={bench.map((p) => p.id)} strategy={verticalListSortingStrategy}>
      {bench.map((p, i) => (
        <SortablePlayerRow
          key={p.id}
          player={p}
          isExistingPlayer={existingPlayerIds.has(p.id)}
          onChange={(patch) =>
            dispatch({ type: "UPDATE_PLAYER", section: "bench", index: i, player: patch })
          }
          onRemove={() => dispatch({ type: "REMOVE_PLAYER", section: "bench", index: i })}
          onExport={() => handleExportPlayer(p, "batter")}
        />
      ))}
    </SortableContext>
    <AddPlayerBtn
      type="button"
      data-testid="custom-team-add-bench-player-button"
      onClick={() => dispatch({ type: "ADD_PLAYER", section: "bench", player: makeBlankBatter() })}
    >
      + Add Player
    </AddPlayerBtn>
    <input
      ref={benchFileRef}
      type="file"
      accept=".json"
      style={{ display: "none" }}
      onChange={onImportFile}
      data-testid="import-bench-player-input"
      aria-label="Import player from file"
    />
    <ImportPlayerBtn type="button" onClick={() => benchFileRef.current?.click()}>
      ↑ Import Player
    </ImportPlayerBtn>
  </FormSection>
);

// ── PitchersSection ────────────────────────────────────────────────────────────

type PitchersSectionProps = {
  pitchers: EditorPlayer[];
  existingPlayerIds: Set<string>;
  pendingPlayerImport: PendingPlayerImport | null;
  dispatch: EditorDispatch;
  setPendingPlayerImport: React.Dispatch<React.SetStateAction<PendingPlayerImport | null>>;
  pitchersFileRef: React.RefObject<HTMLInputElement>;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportPlayer: (p: EditorPlayer, role: "batter" | "pitcher") => void;
  sensors: ReturnType<typeof useSensors>;
  handlePitchersDragEnd: (event: DragEndEvent) => void;
};

/** DnD-enabled pitchers section with its own DndContext (no cross-section transfer). */
const PitchersSection: React.FunctionComponent<PitchersSectionProps> = ({
  pitchers,
  existingPlayerIds,
  pendingPlayerImport,
  dispatch,
  setPendingPlayerImport,
  pitchersFileRef,
  onImportFile,
  handleExportPlayer,
  sensors,
  handlePitchersDragEnd,
}) => (
  <FormSection data-testid="custom-team-pitchers-section">
    <SectionHeading>Pitchers (drag to reorder)</SectionHeading>
    {pendingPlayerImport?.section === "pitchers" && (
      <PlayerDuplicateBanner role="alert" data-testid="player-import-pitchers-duplicate-banner">
        ⚠ {pendingPlayerImport.warning}
        <PlayerDuplicateActions>
          <SmallIconBtn
            type="button"
            data-testid="player-import-pitchers-confirm-button"
            onClick={() => {
              dispatch({
                type: "ADD_PLAYER",
                section: "pitchers",
                player: pendingPlayerImport.player,
              });
              setPendingPlayerImport(null);
            }}
          >
            Import Anyway
          </SmallIconBtn>
          <SmallIconBtn type="button" onClick={() => setPendingPlayerImport(null)}>
            Cancel
          </SmallIconBtn>
        </PlayerDuplicateActions>
      </PlayerDuplicateBanner>
    )}
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handlePitchersDragEnd}
    >
      <SortableContext items={pitchers.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        {pitchers.map((p, i) => (
          <SortablePlayerRow
            key={p.id}
            player={p}
            isPitcher
            isExistingPlayer={existingPlayerIds.has(p.id)}
            onChange={(patch) =>
              dispatch({ type: "UPDATE_PLAYER", section: "pitchers", index: i, player: patch })
            }
            onRemove={() => dispatch({ type: "REMOVE_PLAYER", section: "pitchers", index: i })}
            onExport={() => handleExportPlayer(p, "pitcher")}
          />
        ))}
      </SortableContext>
    </DndContext>
    <AddPlayerBtn
      type="button"
      data-testid="custom-team-add-pitcher-button"
      onClick={() =>
        dispatch({ type: "ADD_PLAYER", section: "pitchers", player: makeBlankPitcher() })
      }
    >
      + Add Pitcher
    </AddPlayerBtn>
    <input
      ref={pitchersFileRef}
      type="file"
      accept=".json"
      style={{ display: "none" }}
      onChange={onImportFile}
      data-testid="import-pitchers-player-input"
      aria-label="Import pitcher from file"
    />
    <ImportPlayerBtn type="button" onClick={() => pitchersFileRef.current?.click()}>
      ↑ Import Pitcher
    </ImportPlayerBtn>
  </FormSection>
);

// ── CustomTeamEditor (main component) ─────────────────────────────────────────

const CustomTeamEditor: React.FunctionComponent<Props> = ({ team, onSave, onCancel }) => {
  const [state, dispatch] = React.useReducer(editorReducer, team, initEditorState);
  const { createTeam, updateTeam, teams: allTeams } = useCustomTeams();
  const errorRef = React.useRef<HTMLParagraphElement>(null);

  const isEditMode = !!team;
  const existingPlayerIds = React.useMemo(
    () =>
      new Set([
        ...(team?.roster.lineup.map((p) => p.id) ?? []),
        ...(team?.roster.bench.map((p) => p.id) ?? []),
        ...(team?.roster.pitchers.map((p) => p.id) ?? []),
      ]),
    [team],
  );

  // ── File input refs for player import ─────────────────────────────────────
  const lineupFileRef = React.useRef<HTMLInputElement>(null);
  const benchFileRef = React.useRef<HTMLInputElement>(null);
  const pitchersFileRef = React.useRef<HTMLInputElement>(null);
  // Tracks an import that is blocked pending user confirmation of a duplicate player.
  const [pendingPlayerImport, setPendingPlayerImport] = React.useState<PendingPlayerImport | null>(
    null,
  );

  // ── Player export ──────────────────────────────────────────────────────────
  const handleExportPlayer = React.useCallback((p: EditorPlayer, role: "batter" | "pitcher") => {
    const teamPlayer = editorPlayerToTeamPlayer(p, role);
    const json = exportCustomPlayer(teamPlayer);
    downloadJson(json, playerFilename(teamPlayer.name || "player"));
  }, []);

  // ── Player import ──────────────────────────────────────────────────────────
  const handleImportPlayerFile = React.useCallback(
    (section: "lineup" | "bench" | "pitchers") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const importedPlayer = parseExportedCustomPlayer(reader.result as string);
          // Remap the ID to avoid collisions with existing players.
          // Preserve playerSeed so sanitizePlayer reuses the original seed and
          // produces the same fingerprint — enabling cross-device duplicate detection.
          const editorPlayer: EditorPlayer = {
            id: makePlayerId(),
            name: importedPlayer.name,
            position: importedPlayer.position ?? "",
            handedness: importedPlayer.handedness ?? "R",
            contact: importedPlayer.batting.contact,
            power: importedPlayer.batting.power,
            speed: importedPlayer.batting.speed,
            ...(importedPlayer.pitching && {
              velocity: importedPlayer.pitching.velocity,
              control: importedPlayer.pitching.control,
              movement: importedPlayer.pitching.movement,
            }),
            ...(importedPlayer.pitchingRole && { pitchingRole: importedPlayer.pitchingRole }),
            ...(importedPlayer.playerSeed && { playerSeed: importedPlayer.playerSeed }),
          };

          // Check if this player's fingerprint already exists in any saved team OR the
          // current editor state (to block re-import in the same unsaved editing session).
          // Use the role that will actually be stored for the destination section
          // so the sig matches what will be written to the DB.
          const sectionRole: "batter" | "pitcher" = section === "pitchers" ? "pitcher" : "batter";
          const incomingFp = buildPlayerSig({ ...importedPlayer, role: sectionRole });

          // Helper: derive role and sig from an EditorPlayer (mirrors editorToTeamPlayer logic).
          const editorPlayerFp = (p: EditorPlayer): string =>
            buildPlayerSig({
              name: p.name,
              role: p.velocity !== undefined ? "pitcher" : "batter",
              batting: { contact: p.contact, power: p.power, speed: p.speed },
              pitching:
                p.velocity !== undefined
                  ? { velocity: p.velocity, control: p.control ?? 60, movement: p.movement ?? 60 }
                  : undefined,
              playerSeed: p.playerSeed,
            });

          // Check saved teams first (early-exit avoids constructing the editor spread).
          const existingTeamWithPlayer = allTeams.find((t: CustomTeamDoc) =>
            [...t.roster.lineup, ...t.roster.bench, ...t.roster.pitchers].some(
              (p: TeamPlayer) => (p.fingerprint ?? buildPlayerSig(p)) === incomingFp,
            ),
          );
          const duplicateTeamName =
            existingTeamWithPlayer?.name ??
            ([...state.lineup, ...state.bench, ...state.pitchers].some(
              (p) => editorPlayerFp(p) === incomingFp,
            )
              ? "this team"
              : null);

          if (duplicateTeamName !== null) {
            setPendingPlayerImport({
              player: editorPlayer,
              section,
              warning: `"${importedPlayer.name}" may already exist on team "${duplicateTeamName}". Import anyway?`,
            });
          } else {
            dispatch({ type: "ADD_PLAYER", section, player: editorPlayer });
          }
        } catch (err) {
          dispatch({
            type: "SET_ERROR",
            error: `Failed to import player: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      };
      reader.readAsText(file);
    },
    [allTeams, state.lineup, state.bench, state.pitchers],
  );

  // Pre-bind per-section import handlers so JSX receives stable references
  // instead of creating a new function on every render.
  const handleImportLineupFile = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleImportPlayerFile("lineup")(e),
    [handleImportPlayerFile],
  );
  const handleImportBenchFile = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleImportPlayerFile("bench")(e),
    [handleImportPlayerFile],
  );
  const handleImportPitchersFile = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleImportPlayerFile("pitchers")(e),
    [handleImportPlayerFile],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLineupBenchDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeInLineup = state.lineup.some((p) => p.id === active.id);
    const activeInBench = state.bench.some((p) => p.id === active.id);
    const overInLineup = state.lineup.some((p) => p.id === over.id);
    const overInBench = state.bench.some((p) => p.id === over.id);
    // Guard: both IDs must belong to lineup or bench (not pitchers or unknown).
    if (!activeInLineup && !activeInBench) return;
    if (!overInLineup && !overInBench) return;
    const activeSection: "lineup" | "bench" = activeInLineup ? "lineup" : "bench";
    const overSection: "lineup" | "bench" = overInLineup ? "lineup" : "bench";
    if (activeSection === overSection) {
      const oldIndex = state[activeSection].findIndex((p) => p.id === active.id);
      const newIndex = state[activeSection].findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(state[activeSection], oldIndex, newIndex);
      dispatch({ type: "REORDER", section: activeSection, orderedIds: reordered.map((p) => p.id) });
    } else {
      const toIndex = state[overSection].findIndex((p) => p.id === over.id);
      // toIndex must be valid since we confirmed over.id is in overSection above.
      dispatch({
        type: "TRANSFER_PLAYER",
        fromSection: activeSection,
        toSection: overSection,
        playerId: String(active.id),
        toIndex: toIndex === -1 ? state[overSection].length : toIndex,
      });
    }
  };

  const handlePitchersDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.pitchers.findIndex((p) => p.id === active.id);
    const newIndex = state.pitchers.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(state.pitchers, oldIndex, newIndex);
    dispatch({ type: "REORDER", section: "pitchers", orderedIds: reordered.map((p) => p.id) });
  };

  const handleGenerate = () => {
    dispatch({ type: "APPLY_DRAFT", draft: generateDefaultCustomTeamDraft(++_generateCounter) });
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

  return (
    <EditorContainer>
      <EditorTitle>{team ? "Edit Team" : "Create Team"}</EditorTitle>

      <FormSection>
        <SectionHeading>Team Info</SectionHeading>
        <TeamInfoGrid>
          <FieldGroup>
            <FieldLabel htmlFor="ct-name">Team Name *</FieldLabel>
            {isEditMode ? (
              <ReadOnlyInput
                id="ct-name"
                value={state.name}
                readOnly
                aria-readonly="true"
                data-testid="custom-team-name-input"
              />
            ) : (
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
            )}
          </FieldGroup>
          <TeamInfoSecondRow>
            <FieldGroup>
              <FieldLabel htmlFor="ct-abbrev">Abbrev * (2–3 chars)</FieldLabel>
              {isEditMode ? (
                <ReadOnlyInput
                  id="ct-abbrev"
                  value={state.abbreviation}
                  readOnly
                  aria-readonly="true"
                  data-testid="custom-team-abbreviation-input"
                />
              ) : (
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
              )}
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="ct-city">City</FieldLabel>
              {isEditMode ? (
                <ReadOnlyInput
                  id="ct-city"
                  value={state.city}
                  readOnly
                  aria-readonly="true"
                  data-testid="custom-team-city-input"
                />
              ) : (
                <TextInput
                  id="ct-city"
                  value={state.city}
                  onChange={(e) =>
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
          <IdentityLockHint>Team identity fields are locked after creation.</IdentityLockHint>
        )}
        {!team && (
          <GenerateBtn
            type="button"
            onClick={handleGenerate}
            data-testid="custom-team-regenerate-defaults-button"
          >
            ✨ Generate Random
          </GenerateBtn>
        )}
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

      <div data-testid="lineup-bench-dnd-container">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleLineupBenchDragEnd}
        >
          <LineupFormSection
            lineup={state.lineup}
            existingPlayerIds={existingPlayerIds}
            pendingPlayerImport={pendingPlayerImport}
            dispatch={dispatch}
            setPendingPlayerImport={setPendingPlayerImport}
            lineupFileRef={lineupFileRef}
            onImportFile={handleImportLineupFile}
            handleExportPlayer={handleExportPlayer}
          />
          <BenchFormSection
            bench={state.bench}
            existingPlayerIds={existingPlayerIds}
            pendingPlayerImport={pendingPlayerImport}
            dispatch={dispatch}
            setPendingPlayerImport={setPendingPlayerImport}
            benchFileRef={benchFileRef}
            onImportFile={handleImportBenchFile}
            handleExportPlayer={handleExportPlayer}
          />
        </DndContext>
      </div>
      <PitchersSection
        pitchers={state.pitchers}
        existingPlayerIds={existingPlayerIds}
        pendingPlayerImport={pendingPlayerImport}
        dispatch={dispatch}
        setPendingPlayerImport={setPendingPlayerImport}
        pitchersFileRef={pitchersFileRef}
        onImportFile={handleImportPitchersFile}
        handleExportPlayer={handleExportPlayer}
        sensors={sensors}
        handlePitchersDragEnd={handlePitchersDragEnd}
      />

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
