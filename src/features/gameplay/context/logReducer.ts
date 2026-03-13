import { announce } from "@feat/gameplay/utils/announce";

export type LogAction =
  | { type: "log"; payload: string; preprocessor?: (text: string) => string }
  | { type: "reset" };

export const logReducer = (
  state: { announcements: string[] },
  action: LogAction,
): { announcements: string[] } => {
  switch (action.type) {
    case "log": {
      const message = action.payload;
      announce(message, { preprocessor: action.preprocessor });
      return { ...state, announcements: [message, ...state.announcements] };
    }
    case "reset":
      return { announcements: [] };
    default: {
      const _exhaustive: never = action;
      throw new Error(`No such reducer type as ${(_exhaustive as { type: string }).type}`);
    }
  }
};
