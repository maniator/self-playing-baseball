import * as React from "react";

import Game from "@components/Game";
import HomeScreen from "@components/HomeScreen";
import ManageTeamsScreen from "@components/ManageTeamsScreen";

type Screen = "home" | "game" | "manage-teams";
export type InitialGameView = "new-game" | "load-saves";

const AppShell: React.FunctionComponent = () => {
  const [screen, setScreen] = React.useState<Screen>("home");
  const [initialGameView, setInitialGameView] = React.useState<InitialGameView>("new-game");

  if (screen === "manage-teams") {
    return <ManageTeamsScreen onBack={() => setScreen("home")} />;
  }

  if (screen === "game") {
    return <Game initialView={initialGameView} />;
  }

  return (
    <HomeScreen
      onNewGame={() => {
        setInitialGameView("new-game");
        setScreen("game");
      }}
      onLoadSaves={() => {
        setInitialGameView("load-saves");
        setScreen("game");
      }}
      onManageTeams={() => setScreen("manage-teams")}
    />
  );
};

export default AppShell;
