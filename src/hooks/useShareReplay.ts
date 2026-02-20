import { LogAction } from "@context/index";
import { buildReplayUrl } from "@utils/rng";

interface ShareSeedArgs {
  dispatchLog: (action: LogAction) => void;
}

export const useShareReplay = ({ dispatchLog }: ShareSeedArgs) => {
  const log = (message: string) => dispatchLog({ type: "log", payload: message });

  const handleShareReplay = () => {
    const url = buildReplayUrl();
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => log("Seed link copied!"))
        .catch(() => window.prompt("Copy this seed link:", url));
    } else {
      window.prompt("Copy this seed link:", url);
    }
  };

  return { handleShareReplay };
};
