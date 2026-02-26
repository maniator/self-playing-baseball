import * as React from "react";

import { resolveTeamLabel } from "@features/customTeams/adapters/customTeamAdapter";
import { RxDatabaseProvider } from "rxdb/plugins/react";

import type { ExhibitionGameSetup, InitialGameView } from "@components/AppShell";
import type { GameAction } from "@context/index";
import { GameProviderWrapper } from "@context/index";
import { useCustomTeams } from "@hooks/useCustomTeams";
import type { BallgameDb } from "@storage/db";
import { getDb, wasDbReset } from "@storage/db";
import { appLog } from "@utils/logger";

import GameInner from "./GameInner";
import { DbResetNotice, LoadingScreen } from "./styles";

type Props = {
  initialView?: InitialGameView;
  newGameRequestCount?: number;
  loadSavesRequestCount?: number;
  onBackToHome?: () => void;
  onManageTeams?: () => void;
  /** Called from AppShell when the in-game New Game button is clicked. */
  onNewGame?: () => void;
  /** Called the first time a real game session starts or a save is loaded. */
  onGameSessionStarted?: () => void;
  /** Setup from /exhibition/new; consumed by GameInner to auto-start a game. */
  pendingGameSetup?: ExhibitionGameSetup | null;
  /** Called after pendingGameSetup is consumed so AppShell can clear it. */
  onConsumeGameSetup?: () => void;
  /** True when the current route is /game; used to pause autoplay off-route. */
  isOnGameRoute?: boolean;
};

const Game: React.FunctionComponent<Props> = ({
  initialView,
  newGameRequestCount,
  loadSavesRequestCount,
  onBackToHome,
  onManageTeams,
  onNewGame,
  onGameSessionStarted,
  pendingGameSetup,
  onConsumeGameSetup,
  isOnGameRoute = true,
}) => {
  const actionBufferRef = React.useRef<GameAction[]>([]);
  const [db, setDb] = React.useState<BallgameDb | null>(null);
  const [dbResetNotice, setDbResetNotice] = React.useState(false);

  // Load custom teams to build the per-call TTS preprocessor that resolves
  // `custom:<id>` fragments to human-readable names before speech.
  const { teams: customTeams } = useCustomTeams();
  const announcePreprocessor = React.useCallback(
    (msg: string) => msg.replace(/custom:[^\s"',]+/g, (id) => resolveTeamLabel(id, customTeams)),
    [customTeams],
  );

  React.useEffect(() => {
    getDb()
      .then((resolvedDb) => {
        // Show the reset notice at most once per browser session even if the
        // component unmounts and remounts (e.g. route change).
        if (wasDbReset() && sessionStorage.getItem("db-reset-dismissed") !== "1") {
          setDbResetNotice(true);
        }
        setDb(resolvedDb);
      })
      .catch((err: unknown) => appLog.error("DB init failed:", err));
  }, []);

  const onDispatch = React.useCallback((action: GameAction) => {
    actionBufferRef.current.push(action);
  }, []);

  if (!db) return <LoadingScreen>Loading game…</LoadingScreen>;

  return (
    <RxDatabaseProvider database={db}>
      <GameProviderWrapper onDispatch={onDispatch} announcePreprocessor={announcePreprocessor}>
        {dbResetNotice && (
          <DbResetNotice data-testid="db-reset-notice">
            <span>
              Your local game data (saves, events, teams, and custom teams) was reset due to an app
              update. Sorry for the inconvenience!
            </span>
            <button
              type="button"
              aria-label="Dismiss notice"
              title="Dismiss notice"
              onClick={() => {
                sessionStorage.setItem("db-reset-dismissed", "1");
                setDbResetNotice(false);
              }}
            >
              ×
            </button>
          </DbResetNotice>
        )}
        <GameInner
          actionBufferRef={actionBufferRef}
          initialView={initialView}
          newGameRequestCount={newGameRequestCount}
          loadSavesRequestCount={loadSavesRequestCount}
          onBackToHome={onBackToHome}
          onManageTeams={onManageTeams}
          onNewGame={onNewGame}
          onGameSessionStarted={onGameSessionStarted}
          pendingGameSetup={pendingGameSetup}
          onConsumeGameSetup={onConsumeGameSetup}
          isOnGameRoute={isOnGameRoute}
        />
      </GameProviderWrapper>
    </RxDatabaseProvider>
  );
};

export default Game;
