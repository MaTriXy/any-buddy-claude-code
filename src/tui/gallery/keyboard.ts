import type { KeyEvent } from '@opentui/core';
import type { KeyHandler } from '@opentui/core';

export interface GalleryKeyboardCallbacks {
  onApply: () => void;
  onCancel: () => void;
  onEnterConfirmMode: () => void;
  onExitConfirmMode: () => void;
}

export interface GalleryKeyboardController {
  isConfirming: () => boolean;
  destroy: () => void;
}

export function setupGalleryKeyboard(
  keyInput: KeyHandler,
  callbacks: GalleryKeyboardCallbacks,
): GalleryKeyboardController {
  let confirmMode = false;

  function enterConfirmMode(): void {
    confirmMode = true;
    callbacks.onEnterConfirmMode();
  }

  function exitConfirmMode(): void {
    confirmMode = false;
    callbacks.onExitConfirmMode();
  }

  function handleKeyPress(key: KeyEvent): void {
    if (key.ctrl && key.name === 'c') {
      callbacks.onCancel();
      return;
    }

    if (confirmMode) {
      if (key.name === 'return' || key.name === 'y') {
        callbacks.onApply();
      } else if (key.name === 'escape' || key.name === 'n') {
        exitConfirmMode();
      }
      return;
    }

    if (key.name === 'return') {
      enterConfirmMode();
    } else if (key.name === 'escape') {
      callbacks.onCancel();
    }
  }

  keyInput.on('keypress', handleKeyPress);

  return {
    isConfirming: () => confirmMode,
    destroy: () => {
      keyInput.removeListener('keypress', handleKeyPress);
    },
  };
}
