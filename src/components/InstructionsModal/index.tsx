import * as React from "react";

import HelpContent from "@components/HelpContent";

import {
  CloseButton,
  CloseXButton,
  Dialog,
  DialogHeader,
  DialogTitle,
  HelpButton,
  ScrollBody,
} from "./styles";

const InstructionsModal: React.FunctionComponent = () => {
  const ref = React.useRef<HTMLDialogElement>(null);

  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) close();
  };

  return (
    <>
      <HelpButton onClick={open} aria-label="How to play">
        ?
      </HelpButton>

      <Dialog ref={ref} onClick={handleClick} data-testid="instructions-modal">
        <DialogHeader>
          <DialogTitle>⚾ How to Play</DialogTitle>
          <CloseXButton onClick={close} aria-label="Close">
            ✕
          </CloseXButton>
        </DialogHeader>

        <ScrollBody>
          <HelpContent />
          <CloseButton onClick={close}>Got it!</CloseButton>
        </ScrollBody>
      </Dialog>
    </>
  );
};

export default InstructionsModal;
