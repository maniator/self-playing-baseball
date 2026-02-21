import * as React from "react";

import { RxDatabaseProvider } from "rxdb/plugins/react";
import styled from "styled-components";

import type { GameAction } from "@context/index";
import { GameProviderWrapper } from "@context/index";
import type { BallgameDb } from "@storage/db";
import { getDb } from "@storage/db";

import GameInner from "./GameInner";

const GithubRibbon = styled.a.attrs({
  href: "https://github.com/maniator/self-playing-baseball",
  "data-ribbon": "View on Github",
  title: "View on Github",
  className: "github-fork-ribbon left-bottom fixed",
  target: "_blank",
  rel: "noreferrer",
})`
  &:before {
    background-color: #2e8b57;
  }
`;

const Game: React.FunctionComponent = () => {
  const actionBufferRef = React.useRef<GameAction[]>([]);
  const [db, setDb] = React.useState<BallgameDb | null>(null);

  React.useEffect(() => {
    getDb()
      .then(setDb)
      .catch(() => {});
  }, []);

  const onDispatch = React.useCallback((action: GameAction) => {
    actionBufferRef.current.push(action);
  }, []);

  if (!db) return null;

  return (
    <RxDatabaseProvider database={db}>
      <GameProviderWrapper onDispatch={onDispatch}>
        <GithubRibbon>View on GitHub</GithubRibbon>
        <GameInner actionBufferRef={actionBufferRef} />
      </GameProviderWrapper>
    </RxDatabaseProvider>
  );
};

export default Game;
