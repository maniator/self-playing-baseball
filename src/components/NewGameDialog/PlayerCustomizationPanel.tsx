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
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { PlayerCustomization, TeamCustomPlayerOverrides } from "@context/index";
import { generateRoster } from "@utils/roster";

import { MOD_OPTIONS, PITCHER_MOD_FIELDS, PITCHER_STAT_LABELS } from "./constants";
import {
  BaseStat,
  ModLabel,
  ModSelect,
  NicknameInput,
  PanelSection,
  PanelToggle,
  PitcherDivider,
  PitcherRow,
  PlayerList,
  PosTag,
  Tab,
  TabBar,
} from "./PlayerCustomizationPanel.styles";
import SortableBatterRow from "./SortableBatterRow";

export type { ModPreset } from "./constants";
export { MOD_OPTIONS } from "./constants";

const PITCHER_BASE_KEYS = ["control", "velocity", "stamina"] as const;

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
    if (!over || active.id === over.id) return;
    const oldIndex = activeOrder.indexOf(active.id as string);
    const newIndex = activeOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onActiveOrderChange(arrayMove(activeOrder, oldIndex, newIndex));
  };

  const updateField = (playerId: string, field: keyof PlayerCustomization, raw: string) => {
    const current = activeOverrides[playerId] ?? {};
    let value: string | number | undefined;
    if (field === "nickname") {
      value = raw || undefined;
    } else {
      const n = parseInt(raw, 10);
      value = isNaN(n) || n === 0 ? undefined : n;
    }
    const updated: PlayerCustomization = { ...current, [field]: value };
    (Object.keys(updated) as (keyof PlayerCustomization)[]).forEach((k) => {
      if (updated[k] === undefined) delete updated[k];
    });
    const nextOverrides: TeamCustomPlayerOverrides = { ...activeOverrides };
    if (Object.keys(updated).length === 0) {
      delete nextOverrides[playerId];
    } else {
      nextOverrides[playerId] = updated;
    }
    onActiveChange(nextOverrides);
  };

  const getNick = (id: string) => (activeOverrides[id]?.nickname as string | undefined) ?? "";
  const getMod = (id: string, field: keyof PlayerCustomization) => {
    const v = activeOverrides[id]?.[field];
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
              {PITCHER_MOD_FIELDS.map((field, i) => {
                const modValue = parseInt(getMod(pitcher.id, field), 10) || 0;
                const effective = Math.max(
                  0,
                  Math.min(120, pitcher.baseStats[PITCHER_BASE_KEYS[i]] + modValue),
                );
                return (
                  <ModLabel key={field}>
                    {PITCHER_STAT_LABELS[i]}
                    <BaseStat $modified={modValue !== 0}>{effective}</BaseStat>
                    <ModSelect
                      value={getMod(pitcher.id, field)}
                      onChange={(e) => updateField(pitcher.id, field, e.target.value)}
                      aria-label={`${pitcher.position} ${PITCHER_STAT_LABELS[i]}`}
                    >
                      {MOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </ModSelect>
                  </ModLabel>
                );
              })}
            </PitcherRow>
          </PlayerList>
        </>
      )}
    </PanelSection>
  );
};

export default PlayerCustomizationPanel;
