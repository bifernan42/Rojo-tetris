import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GameInfo from '../game/GameInfo';
import type { GameSnapshot, RoomState } from '../../common/protocol';
import { createGame } from '../../engine/game';
import { createTetromino } from '../../engine/tetrominoes';

const game: GameSnapshot = {
  ...createGame(createTetromino('O')),
  lines: 3,
  score: 300,
  elapsedMs: 65000,
  nextTetromino: createTetromino('T'),
};

const room: RoomState = {
  name: 'friends',
  hostId: 'alice',
  status: 'PLAYING',
  hardMode: false,
  winnerId: null,
  winnerName: null,
  players: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }],
};

function render(state = game, roomState = room) {
  return renderToStaticMarkup(createElement(GameInfo, {
    game: state, room: roomState, playerId: 'alice', name: 'Alice',
  }));
}

describe('GameInfo', () => {
  it('shows the player, score, lines, and time in minutes and seconds', () => {
    const html = render();
    expect(html).toContain('Alice');
    expect(html).toContain('Score <strong>300</strong>');
    expect(html).toContain('Lines <strong>3</strong>');
    expect(html).toContain('Time <strong>01:05</strong>');
  });

  it('shows the next piece during play', () => {
    const html = render();
    expect(html).toContain('aria-label="Next piece: T"');
    expect(html.match(/data-kind="T"/g)).toHaveLength(4);
    expect(html).not.toContain('Game over');
  });

  it('shows game over and hides the preview when eliminated', () => {
    const html = render({ ...game, gameOver: true });
    expect(html).toContain('Game over');
    expect(html).toContain('aria-label="No next piece"');
    expect(html).not.toContain('data-kind=');
  });

  it.each([
    ['alice', 'You won!'],
    ['bob', 'You lost'],
    [null, 'Draw'],
  ])('shows the result when the winner is %s', (winnerId, result) => {
    const html = render(game, { ...room, status: 'FINISHED', winnerId });
    expect(html).toContain(result);
    expect(html).toContain('aria-label="No next piece"');
  });

  it('shows game over instead of a draw in solo mode', () => {
    const html = render({ ...game, gameOver: true }, {
      ...room, status: 'FINISHED', players: [room.players[0]!],
    });
    expect(html).toContain('Game over');
    expect(html).not.toContain('Draw');
  });
});
