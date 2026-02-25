import * as React from "react";

import { RxDatabaseProvider } from "rxdb/plugins/react";

import type { InitialGameView } from "@components/AppShell";
import type { GameAction } from "@context/index";
import { GameProviderWrapper } from "@context/index";
import type { BallgameDb } from "@storage/db";
import { getDb } from "@storage/db";
import { appLog } from "@utils/logger";

import GameInner from "./GameInner";
import { LoadingScreen } from "./styles";

type Props = {
  initialView?: InitialGameView;
  newGameRequestCount?: number;
  loadSavesRequestCount?: number;
  onBackToHome?: () => void;
  onManageTeams?: () => void;
  /** Called the first time a real game session starts or a save is loaded. */
  onGameSessionStarted?: () => void;
};

const Game: React.FunctionComponent<Props> = ({
  initialView,
  newGameRequestCount,
  loadSavesRequestCount,
  onBackToHome,
  onManageTeams,
  onGameSessionStarted,
}) => {
  const actionBufferRef = React.useRef<GameAction[]>([]);
  const [db, setDb] = React.useState<BallgameDb | null>(null);

  React.useEffect(() => {
    getDb()
      .then(setDb)
      .catch((err: unknown) => appLog.error("DB init failed:", err));
  }, []);

  const onDispatch = React.useCallback((action: GameAction) => {
    actionBufferRef.current.push(action);
  }, []);

  if (!db) return <LoadingScreen>Loading game…</LoadingScreen>;

  return (
    <RxDatabaseProvider database={db}>
      <GameProviderWrapper onDispatch={onDispatch}>
        <GameInner
          actionBufferRef={actionBufferRef}
          initialView={initialView}
          newGameRequestCount={newGameRequestCount}
          loadSavesRequestCount={loadSavesRequestCount}
          onBackToHome={onBackToHome}
          onManageTeams={onManageTeams}
          onGameSessionStarted={onGameSessionStarted}
        />
      </GameProviderWrapper>
    </RxDatabaseProvider>
  );
};

export default Game;
