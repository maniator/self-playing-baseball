import { buildReplayUrl } from "../../utilities/rng";

interface ShareReplayArgs {
  managerMode: boolean;
  dispatchLog: Function;
}

export const useShareReplay = ({ managerMode, dispatchLog }: ShareReplayArgs) => {
  const log = (message: string) => dispatchLog({ type: "log", payload: message });

  const handleShareReplay = () => {
    const url = buildReplayUrl();
    const managerNote = managerMode
      ? "\n\nNote: Manager Mode decisions are not included in the replay — the same pitches will occur, but you'll need to make the same decisions again."
      : "";
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => log(managerMode ? "Replay link copied! (Manager decisions not included)" : "Replay link copied!"))
        .catch(() => window.prompt(`Copy this replay link:${managerNote}`, url));
    } else {
      window.prompt(`Copy this replay link:${managerNote}`, url);
    }
  };

  return { handleShareReplay };
};
