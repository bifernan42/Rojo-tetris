import { describe, expect, it } from "vitest";
import { createGame, hardDrop, move, receivePenalties, tick } from "../game";
import { createTetromino } from "../tetrominoes";
import { translate } from "../transformations";
import { EMPTY, FILLED, INDESTRUCTIBLE } from "../consts";

const next = translate(createTetromino("O"), 4, 0);

describe("game transitions", () => {
  it("clears cells and colours together while retaining the locked animation snapshot", () => {
    const game = createGame(translate(createTetromino("O"), 4, 18));
    game.lines = 3;
    game.board[19] = Array(10).fill(FILLED);
    game.blockKinds[19] = Array(10).fill("I");
    for (const x of [4, 5]) {
      game.board[19]![x] = EMPTY;
      game.blockKinds[19]![x] = null;
    }
    const original = structuredClone(game);
    game.board.forEach(Object.freeze);
    game.blockKinds.forEach(Object.freeze);
    Object.freeze(game.board);
    Object.freeze(game.blockKinds);
    Object.freeze(game);

    const result = tick(game, next);
    expect(result.locked).toBe(true);
    expect(result.state.lines).toBe(4);
    expect(result.state.tetromino).toBe(next);
    expect(result.state.board[0]).toEqual(Array(10).fill(EMPTY));
    expect(result.state.blockKinds[0]).toEqual(Array(10).fill(null));
    expect(result.state.board[19]![4]).toBe(FILLED);
    expect(result.state.blockKinds[19]![4]).toBe("O");
    expect(result.state.boardEffect).toMatchObject({
      id: 1,
      clearedRows: [19],
      insertedRows: 0,
    });
    expect(result.state.boardEffect!.lockedBoard[19]).toEqual(Array(10).fill(FILLED));
    expect(result.state.boardEffect!.lockedKinds[19]![0]).toBe("I");
    expect(result.state.boardEffect!.lockedKinds[19]![4]).toBe("O");
    expect(game).toEqual(original);

    const withoutClear = hardDrop(result.state, next);
    expect(withoutClear.state.lines).toBe(4);
    expect(withoutClear.state.boardEffect).toBe(result.state.boardEffect);
  });

  it("reports lock-out without settling a piece above the board", () => {
    const game = createGame(translate(createTetromino("O"), 4, -1));
    game.board[1]![4] = FILLED;
    const result = tick(game, next);
    expect(result.locked).toBe(false);
    expect(result.state.eliminationReason).toBe("lock-out");
    expect(result.state.gameOver).toBe(true);
    expect(result.state.board).toBe(game.board);
    expect(result.state.tetromino).toBe(game.tetromino);
  });

  it("allows adjustment after landing, and locks on the following tick", () => {
    const game = createGame(translate(createTetromino("O"), 4, 17));
    const landed = tick(game, next);
    expect(landed.locked).toBe(false);
    expect(landed.state.tetromino.position).toEqual([4, 18]);
    const adjusted = move(landed.state, -1, 0);
    const locked = tick(adjusted, next);
    expect(locked.locked).toBe(true);
    expect(locked.state.board[19]![3]).toBe(FILLED);
    expect(game.board.flat().every((cell) => cell === EMPTY)).toBe(true);
  });

  it("inserts incoming penalty rows immediately and lifts the active piece", () => {
    const game = createGame(translate(createTetromino("O"), 4, 10));
    game.board[19]![0] = FILLED;
    game.blockKinds[19]![0] = "I";
    const result = receivePenalties(game, 2);
    expect(result.board.slice(-2)).toEqual(
      Array.from({ length: 2 }, () => Array(10).fill(INDESTRUCTIBLE)),
    );
    expect(result.board[17]![0]).toBe(FILLED);
    expect(result.blockKinds[17]![0]).toBe("I");
    expect(result.blockKinds.slice(-2).flat().every((kind) => kind === null)).toBe(true);
    expect(result.tetromino.position).toEqual([4, 8]);
    expect(result.boardEffect).toMatchObject({ clearedRows: [], insertedRows: 2, lockedBoard: game.board });
    expect(result.gameOver).toBe(false);
    expect(game.board[19]![0]).toBe(FILLED);
    expect(game.board[18]!.every((cell) => cell === EMPTY)).toBe(true);
  });

  it("ignores empty attacks and finished games", () => {
    const game = createGame(next);
    expect(receivePenalties(game, 0)).toBe(game);
    const over = { ...game, gameOver: true };
    expect(receivePenalties(over, 3)).toBe(over);
  });

  it("does not insert penalties when a piece locks", () => {
    const result = hardDrop(createGame(next), next);
    expect(result.locked).toBe(true);
    expect(result.state.board.flat().includes(INDESTRUCTIBLE)).toBe(false);
  });

  it("never clears indestructible rows", () => {
    const game = createGame(next);
    game.board[19] = Array(10).fill(INDESTRUCTIBLE);
    const result = hardDrop(game, next).state;
    expect(result.lines).toBe(0);
    expect(result.board[19]).toEqual(game.board[19]);
  });

  it("reports penalty overflow separately from a blocked spawn", () => {
    const overflow = createGame(next);
    overflow.board[0]![0] = FILLED;
    expect(receivePenalties(overflow, 1)).toMatchObject({
      gameOver: true,
      eliminationReason: "penalty-overflow",
    });
    const blocked = createGame(translate(createTetromino("O"), 0, 18));
    blocked.board[0]![4] = FILLED;
    expect(tick(blocked, next).state).toMatchObject({
      gameOver: true,
      eliminationReason: "blocked-spawn",
    });
  });

  it("does not advance an eliminated player", () => {
    const game = { ...createGame(next), gameOver: true };
    expect(tick(game, next)).toEqual({ state: game, locked: false });
    expect(hardDrop(game, next).state).toBe(game);
    expect(move(game, 1, 0)).toBe(game);
  });
});
