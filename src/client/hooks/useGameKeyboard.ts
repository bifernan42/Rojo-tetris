import { useEffect } from 'react';
import type { PlayerMove } from '../../common/protocol';
import { useClientActions } from '../state/createClientState';
import { sendMove } from '../state/clientState';

export default function useGameKeyboard(canPlay: boolean) {
  const sendClientAction = useClientActions();
  useEffect(() => {
    if (!canPlay) return;
    const actions: Record<string, PlayerMove> = {
      ArrowLeft: 'MOVE_LEFT', ArrowRight: 'MOVE_RIGHT', ArrowUp: 'ROTATE_RIGHT',
      ArrowDown: 'SOFT_DROP', Space: 'HARD_DROP',
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Preserve typing and keyboard activation of buttons.
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, button')) return;
      const action = actions[event.code];
      if (!action) return;
      event.preventDefault();
      sendClientAction(sendMove(action));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canPlay, sendClientAction]);
}
