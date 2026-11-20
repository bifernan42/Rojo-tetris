import { beforeEach, describe, expect, it } from 'vitest';
import { ScoreStorer } from '../ScoreStorer';

describe('ScoreStorer', () => {
  let scores: ScoreStorer;

  beforeEach(() => {
    scores = new ScoreStorer(':memory:');
  });

  it('starts with an empty leaderboard', () => {
    expect(scores.topTen()).toEqual([]);
  });

  it('keeps only the best score for each player', () => {
    scores.save({ name: 'Alice', score: 100 });
    scores.save({ name: 'Alice', score: 300 });
    scores.save({ name: 'Alice', score: 200 });
    scores.save({ name: 'Alice', score: 300 });

    expect(scores.topTen()).toEqual([{ name: 'Alice', score: 300 }]);
  });

  it('sorts by score, then by name when scores are tied', () => {
    scores.save({ name: 'Zoe', score: 200 });
    scores.save({ name: 'Bob', score: 100 });
    scores.save({ name: 'Alice', score: 200 });

    expect(scores.topTen()).toEqual([
      { name: 'Alice', score: 200 },
      { name: 'Zoe', score: 200 },
      { name: 'Bob', score: 100 },
    ]);
  });

  it('returns only the ten highest scores', () => {
    for (let i = 1; i <= 12; i++) scores.save({ name: `Player ${i}`, score: i * 100 });

    const top = scores.topTen();
    expect(top).toHaveLength(10);
    expect(top[0]).toEqual({ name: 'Player 12', score: 1200 });
    expect(top[9]).toEqual({ name: 'Player 3', score: 300 });
  });

  it('accepts zero and rejects negative scores', () => {
    scores.save({ name: 'Alice', score: 0 });
    expect(() => scores.save({ name: 'Alice', score: -100 })).toThrow();
    expect(scores.topTen()).toEqual([{ name: 'Alice', score: 0 }]);
  });

  it('stores names containing quotes as plain text', () => {
    scores.save({ name: "O'Brien", score: 100 });
    expect(scores.topTen()).toEqual([{ name: "O'Brien", score: 100 }]);
  });
});
