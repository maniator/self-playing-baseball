import * as React from "react";

import { DEFAULT_AWAY_TEAM, DEFAULT_HOME_TEAM } from "./constants";
export { DEFAULT_AWAY_TEAM, DEFAULT_HOME_TEAM } from "./constants";
import {
  Dialog,
  FieldGroup,
  FieldLabel,
  Input,
  PlayBallButton,
  RadioLabel,
  SectionLabel,
  Title,
} from "./styles";

type ManagedTeam = 0 | 1 | null;

type Props = {
  initialHome: string;
  initialAway: string;
  onStart: (homeTeam: string, awayTeam: string, managedTeam: ManagedTeam) => void;
};

const NewGameDialog: React.FunctionComponent<Props> = ({ initialHome, initialAway, onStart }) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [home, setHome] = React.useState(initialHome);
  const [away, setAway] = React.useState(initialAway);
  const [managed, setManaged] = React.useState<"none" | "0" | "1">("none");

  React.useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mt: ManagedTeam = managed === "none" ? null : (Number(managed) as 0 | 1);
    onStart(home.trim() || DEFAULT_HOME_TEAM, away.trim() || DEFAULT_AWAY_TEAM, mt);
    ref.current?.close();
  };

  const homeLabel = home.trim() || "Home";
  const awayLabel = away.trim() || "Away";

  return (
    <Dialog ref={ref} onCancel={(e) => e.preventDefault()}>
      <Title>⚾ New Game</Title>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <FieldLabel htmlFor="ng-home">Home team</FieldLabel>
          <Input
            id="ng-home"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            maxLength={30}
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel htmlFor="ng-away">Away team</FieldLabel>
          <Input
            id="ng-away"
            value={away}
            onChange={(e) => setAway(e.target.value)}
            maxLength={30}
          />
        </FieldGroup>
        <FieldGroup>
          <SectionLabel>Manage a team?</SectionLabel>
          {(["none", "0", "1"] as const).map((v) => (
            <RadioLabel key={v}>
              <input
                type="radio"
                name="managed"
                value={v}
                checked={managed === v}
                onChange={() => setManaged(v)}
              />
              {v === "none"
                ? "None — just watch"
                : v === "0"
                  ? `Away (${awayLabel})`
                  : `Home (${homeLabel})`}
            </RadioLabel>
          ))}
        </FieldGroup>
        <PlayBallButton type="submit">Play Ball!</PlayBallButton>
      </form>
    </Dialog>
  );
};

export default NewGameDialog;
