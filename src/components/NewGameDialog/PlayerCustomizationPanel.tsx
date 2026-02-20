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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { PlayerCustomization, TeamCustomPlayerOverrides } from "@context/index";
import type { Player } from "@utils/roster";
import { generateRoster } from "@utils/roster";

import {
  DragHandle,
  ModLabel,
  ModSelect,
  NicknameInput,
  PanelSection,
  PanelToggle,
  PitcherDivider,
  PitcherRow,
  PlayerList,
  PlayerRow,
  PosTag,
  Tab,
  TabBar,
} from "./styles";

export type ModPreset = -20 | -10 | -5 | 0 | 5 | 10 | 20;

export const MOD_OPTIONS: ReadonlyArray<{ readonly label: string; readonly value: ModPreset }> = [
  { label: "Elite", value: 20 },
  { label: "High", value: 10 },
  { label: "Above", value: 5 },
  { label: "Avg", value: 0 },
  { label: "Below", value: -5 },
  { label: "Low", value: -10 },
  { label: "Poor", value: -20 },
];

const BATTER_MOD_LABELS = ["CON", "PWR", "SPD"] as const;
const PITCHER_MOD_LABELS = ["CTL", "VEL", "STM"] as const;

type Props = {
  awayTeam: string;
  homeTeam: string;
  awayOverrides: TeamCustomPlayerOverrides;
  homeOverrides: TeamCustomPlayerOverrides;
  onAwayChange: (overrides: TeamCustomPlayerOverrides) => void;
  onHomeChange: (overrides: TeamCustomPlayerOverrides) => void;
  awayOrder: string[];
  homeOrder: string[];
  onAwayOrderChange: (order: string[]) => void;
  onHomeOrderChange: (order: string[]) => void;
};

type BatterRowProps = {
  player: Player;
  overrides: TeamCustomPlayerOverrides;
  onFieldChange: (id: string, field: keyof PlayerCustomization, raw: string) => void;
};

const SortableBatterRow: React.FunctionComponent<BatterRowProps> = ({
  player,
  overrides,
  onFieldChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const nick = (overrides[player.id]?.nickname as string | undefined) ?? "";
  const getMod = (field: keyof PlayerCustomization) => {
    const v = overrides[player.id]?.[field];
    return v === undefined ? "0" : String(v);
  };
  return (
    <PlayerRow ref={setNodeRef} style={style}>
      <DragHandle {...attributes} {...listeners} aria-label={`Drag ${player.position}`}>
        ⠿
      </DragHandle>
      <PosTag>{player.position}</PosTag>
      <NicknameInput
        type="text"
        placeholder="Nickname"
        maxLength={20}
        value={nick}
        onChange={(e) => onFieldChange(player.id, "nickname", e.target.value)}
        aria-label={`${player.position} nickname`}
      />
      {(["contactMod", "powerMod", "speedMod"] as const).map((field, i) => (
        <ModLabel key={field}>
          {BATTER_MOD_LABELS[i]}
          <ModSelect
            value={getMod(field)}
            onChange={(e) => onFieldChange(player.id, field, e.target.value)}
            aria-label={`${player.position} ${BATTER_MOD_LABELS[i]}`}
          >
            {MOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </ModSelect>
        </ModLabel>
      ))}
    </PlayerRow>
  );
};

const PlayerCustomizationPanel: React.FunctionComponent<Props> = ({
  awayTeam,
  homeTeam,
  awayOverrides,
  homeOverrides,
  onAwayChange,
  onHomeChange,
  awayOrder,
  homeOrder,
  onAwayOrderChange,
  onHomeOrderChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"away" | "home">("away");

  const awayRoster = React.useMemo(() => generateRoster(awayTeam), [awayTeam]);
  const homeRoster = React.useMemo(() => generateRoster(homeTeam), [homeTeam]);

  const activeRoster = activeTab === "away" ? awayRoster : homeRoster;
  const activeOverrides = activeTab === "away" ? awayOverrides : homeOverrides;
  const onActiveChange = activeTab === "away" ? onAwayChange : onHomeChange;
  const activeOrder = activeTab === "away" ? awayOrder : homeOrder;
  const onActiveOrderChange = activeTab === "away" ? onAwayOrderChange : onHomeOrderChange;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = activeOrder.indexOf(active.id as string);
      const newIndex = activeOrder.indexOf(over.id as string);
      onActiveOrderChange(arrayMove(activeOrder, oldIndex, newIndex));
    }
  };

  const updateField = (playerId: string, field: keyof PlayerCustomization, raw: string) => {
    const current = activeOverrides[playerId] ?? {};
    let value: string | number | undefined;
    if (field === "nickname") {
      value = raw || undefined;
    } else {
      const n = parseInt(raw, 10);
      // Store 0 as undefined so the override stays sparse (Avg = no override)
      value = isNaN(n) || n === 0 ? undefined : n;
    }
    const updated: PlayerCustomization = { ...current, [field]: value };
    (Object.keys(updated) as (keyof PlayerCustomization)[]).forEach((k) => {
      if (updated[k] === undefined) delete updated[k];
    });
    onActiveChange({ ...activeOverrides, [playerId]: updated });
  };

  const getNick = (playerId: string) =>
    (activeOverrides[playerId]?.nickname as string | undefined) ?? "";

  const getMod = (playerId: string, field: keyof PlayerCustomization) => {
    const v = activeOverrides[playerId]?.[field];
    return v === undefined ? "0" : String(v);
  };

  const orderedBatters = [...activeRoster.batters].sort(
    (a, b) => activeOrder.indexOf(a.id) - activeOrder.indexOf(b.id),
  );
  const { pitcher } = activeRoster;

  return (
    <PanelSection>
      <PanelToggle type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "▾" : "▸"} Customize Players
      </PanelToggle>
      {open && (
        <>
          <TabBar>
            <Tab $active={activeTab === "away"} type="button" onClick={() => setActiveTab("away")}>
              Away: {awayTeam}
            </Tab>
            <Tab $active={activeTab === "home"} type="button" onClick={() => setActiveTab("home")}>
              Home: {homeTeam}
            </Tab>
          </TabBar>
          <PlayerList>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={activeOrder} strategy={verticalListSortingStrategy}>
                {orderedBatters.map((player) => (
                  <SortableBatterRow
                    key={player.id}
                    player={player}
                    overrides={activeOverrides}
                    onFieldChange={updateField}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <PitcherDivider>Starting Pitcher</PitcherDivider>
            <PitcherRow>
              <span />
              <PosTag>{pitcher.position}</PosTag>
              <NicknameInput
                type="text"
                placeholder="Nickname"
                maxLength={20}
                value={getNick(pitcher.id)}
                onChange={(e) => updateField(pitcher.id, "nickname", e.target.value)}
                aria-label={`${pitcher.position} nickname`}
              />
              {(["controlMod", "velocityMod", "staminaMod"] as const).map((field, i) => (
                <ModLabel key={field}>
                  {PITCHER_MOD_LABELS[i]}
                  <ModSelect
                    value={getMod(pitcher.id, field)}
                    onChange={(e) => updateField(pitcher.id, field, e.target.value)}
                    aria-label={`${pitcher.position} ${PITCHER_MOD_LABELS[i]}`}
                  >
                    {MOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </ModSelect>
                </ModLabel>
              ))}
            </PitcherRow>
          </PlayerList>
        </>
      )}
    </PanelSection>
  );
};

export default PlayerCustomizationPanel;
