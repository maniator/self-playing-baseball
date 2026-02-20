import { buildReplayUrl } from "@utils/rng";

interface ShareReplayArgs {
  managerMode: boolean;
  decisionLog: string[];
  dispatchLog: Function;
}

export const useShareReplay = ({ managerMode, decisionLog, dispatchLog }: ShareReplayArgs) => {
  const log = (message: string) => dispatchLog({ type: "log", payload: message });

  const handleShareReplay = () => {
    const url = buildReplayUrl(managerMode && decisionLog.length > 0 ? decisionLog : undefined);
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => log("Replay link copied!"))
        .catch(() => window.prompt("Copy this replay link:", url));
    } else {
      window.prompt("Copy this replay link:", url);
    }
  };

  return { handleShareReplay };
};
