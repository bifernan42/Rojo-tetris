import { describe, it, expect } from 'vitest';
import { Player } from '../Player'

describe('Player', () => {
  it('creates a Player with a name and connection id', () => {

    const player = new Player('123', 'player1');

    expect(player.id).toBe('123');
    expect(player.name).toBe('player1');
  })
})