import * as React from "react";

/**
 * Registers a keyup listener that triggers a pitch on Spacebar,
 * unless auto-play is active or the user is typing in a text input.
 */
export const useKeyboardPitch = (
  autoPlayRef: React.MutableRefObject<boolean>,
  handleClickRef: React.MutableRefObject<() => void>,
): void => {
  const handlePitch = React.useCallback((event: KeyboardEvent) => {
    if (autoPlayRef.current) return;
    if ((event.target as HTMLInputElement).type !== "text") {
      handleClickRef.current();
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener("keyup", handlePitch, false);
    return () => window.removeEventListener("keyup", handlePitch, false);
  }, [handlePitch]);
};
