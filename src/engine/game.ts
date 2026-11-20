import type { Board } from "./board";
import { createBoard } from "./board";
import { EMPTY, FILLED, INDESTRUCTIBLE } from "./consts";
import type { Point, Tetromino, TetrominoKind } from "./tetrominoes";
import { translate, rotateRight } from "./transformations";
import { injectPenaltyLines } from "./penalties";

/**
 * # EliminationReason
 *
 * Describes why a player was eliminated, rather than the whole game-over state.
 */
export type EliminationReason =
  "blocked-spawn" | "penalty-overflow" | "lock-out" | "disconnected";

/** Colour of each settled board cell; empty and penalty cells have no kind. */
export type BlockKinds = (TetrominoKind | null)[][];

/**
 * Presentation data for the latest clear/penalty event
 * Allows animations in the client
 */
export type BoardEffect = {
  id: number;
  clearedRows: number[];
  insertedRows: number;
  lockedBoard: Board;
  lockedKinds: BlockKinds;
};

/**
 * # GameState
 *
 * The GameState that is produced by the pure functions.
 */
export type GameState = {
  board: Board; // the board, the array of numbers
  boardEffect: BoardEffect | null; // summary of the clear / penalty
  blockKinds: BlockKinds; // helper for printing
  tetromino: Tetromino; // the tetromino
  gameOver: boolean; // if the game is over
  lines: number; // number of lines cleared
  eliminationReason: EliminationReason | null; // helper message to display KO reason
};

/**
 * # GameTransition
 *
 * The resulting state and whether this operation settled a piece on the board.
 * The server uses `locked` to advance the piece sequence once. It belongs to
 * the transition, not GameState, because it describes an event, not a lasting
 * property of the new active piece. It is not a safety or concurrency lock.
 */
export type GameTransition = { state: GameState; locked: boolean };

/**
 * # createGame
 *
 * *Pure* function return an initial GameState
 *
 * @param initialTetromino First active piece, including its spawn position
 * @returns `GameState`
 */
export function createGame(initialTetromino: Tetromino): GameState {
  const board = createBoard();
  const gameOver = !canPlace(board, initialTetromino);
  return {
    board,
    boardEffect: null,
    blockKinds: board.map((row) => row.map(() => null)),
    tetromino: initialTetromino,
    gameOver,
    lines: 0,
    eliminationReason: gameOver ? "blocked-spawn" : null,
  };
}

/**
 * # getCellsOnBoard
 *
 * *Pure* helper that returns new coordinate pairs without changing the tetromino.
 * Returns the tetromino's square coordinates
 * in the grid referential
 * @param tetromino Piece whose cells are expressed relative to its position
 * @returns `Point[]`
 */
export function getCellsOnBoard(tetromino: Tetromino): Point[] {
  const [px, py] = tetromino.position;
  return tetromino.cells.map(([x, y]) => [x + px, y + py] as const);
}

/**
 * # canPlace
 *
 * Helper function that tells if a displaced tetromino
 * can be placed where its position tells it is, using the
 * `getCellsOnBoard` function to read the tetromino coordinates
 * in the grid referential. Cells above the visible board (y < 0) are allowed
 * while moving or rotating, but locking there ends the game (lock-out).
 * @param board Current settled cells
 * @param tetromino Candidate piece with its requested position and rotation
 * @returns `boolean`
 */
export function canPlace(board: Board, tetromino: Tetromino): boolean {
  return getCellsOnBoard(tetromino).every(
    ([x, y]) =>
      x >= 0 &&
      x < board[0]!.length &&
      y < board.length &&
      (y < 0 || board[y]![x] === EMPTY),
  );
}

/**
 * # move
 *
 * *Pure* function that attempts to return a new GameState, where the
 * `tetromino` is displaced by `(dx, dy)`
 *
 * If we're currently in a GameOver state or if tetromino does not fit
 *
 * in the current grid state, it simply returns `state`
 * @param state Current GameState
 * @param dx requested x-axis displacement
 * @param dy requested y-axis displacement
 * @returns `state` or `new state`, the GameState
 */
export function move(state: GameState, dx: number, dy: number): GameState {
  if (state.gameOver) return state;
  const tetromino = translate(state.tetromino, dx, dy);
  return canPlace(state.board, tetromino) ? { ...state, tetromino } : state;
}

/**
 * # rotate
 *
 * *Pure* function, tries to create a new GameState based on
 * provided initial state, by rotating the tetromino right.
 *
 * If it fails to do so because the tetromino can't fit, or
 * because we're at a gameOver inner state, it returns `state`
 *
 * @param state initial state
 * @returns `state` or `new state`, the GameState
 */
export function rotate(state: GameState): GameState {
  if (state.gameOver) return state;
  const tetromino = rotateRight(state.tetromino);
  return canPlace(state.board, tetromino) ? { ...state, tetromino } : state;
}

/**
 * # lockPiece
 *
 * Produces a new state with a copy of the previous board, where the
 * state.tetromino coordinates are marked FILLED (1).
 * The caller must check for lock-out before writing cells onto the board.
 *
 * @param state Current GameState with a piece ready to settle
 * @returns New GameState with the piece written into the board and block kinds
 */
function lockPiece(state: GameState): GameState {
  // Copy current rows.
  const lockedBoard: Board = state.board.map((row) => [...row]);

  // Copy block kinds: I, L, T, S, Z, O, J, for colour handling.
  const lockedKinds: BlockKinds = state.blockKinds.map((row) => [...row]);
  const pieceCells = getCellsOnBoard(state.tetromino);
  const pieceKind = state.tetromino.kind;

  // Write each block that composes the tetromino to the board.
  for (const [x, y] of pieceCells) {
    lockedBoard[y]![x] = FILLED;
    lockedKinds[y]![x] = pieceKind;
  }

  const lockedState: GameState = {
    ...state,
    board: lockedBoard,
    blockKinds: lockedKinds,
  };
  return lockedState;
}

/**
 * # clearCompletedRows
 *
 * Copies the remaining rows below empty rows that replace the cleared lines.
 * You can clear at most 4 lines with the I piece, that's called a tetris.
 * Board cells and their colours move together. 
 * 
 * A clear also updates the line
 * count and records the locked board before clearing for client animations.
 *
 * @param state GameState after the active piece has been locked
 * @returns New GameState with completed destructible rows removed
 */
function clearCompletedRows(state: GameState): GameState {
  const lockedBoard = state.board;
  const lockedKinds = state.blockKinds;
  const remainingRowIndices: number[] = [];
  const clearedRowIndices: number[] = [];

  // rows containing empty or indestructible cells survive a clear
  for (const [rowIndex, row] of lockedBoard.entries()) {
    const rowSurvives = row.some(
      (cell) => cell === EMPTY || cell === INDESTRUCTIBLE,
    );
    if (rowSurvives) {
      remainingRowIndices.push(rowIndex);
    } else {
      clearedRowIndices.push(rowIndex);
    }
  }

  const remainingRows = remainingRowIndices.map((y) => lockedBoard[y]!);
  const remainingKinds = remainingRowIndices.map((y) => lockedKinds[y]!);

  // previous length minus remaining length gives the number of cleared rows
  const clearedCount = lockedBoard.length - remainingRows.length;

  // replace cleared rows with empty rows at the top
  const emptyRows = createBoard().slice(0, clearedCount);
  const emptyKinds: BlockKinds = emptyRows.map((row) => row.map(() => null));
  const clearedBoard: Board = [...emptyRows, ...remainingRows];
  const clearedKinds: BlockKinds = [...emptyKinds, ...remainingKinds];
  const totalLines = state.lines + clearedCount;

  // Keep the latest effect when no rows clear, including its event identifier
  let boardEffect = state.boardEffect;
  if (clearedCount > 0) {
    const nextEffectId = (state.boardEffect?.id ?? 0) + 1;
    boardEffect = {
      id: nextEffectId,
      clearedRows: clearedRowIndices,
      insertedRows: 0,
      lockedBoard,
      lockedKinds,
    };
  }

  const clearedState: GameState = {
    ...state,
    board: clearedBoard,
    blockKinds: clearedKinds,
    boardEffect,
    lines: totalLines,
  };
  return clearedState;
}

/**
 * # spawn
 *
 * Makes the next tetromino spawn after the current piece has been locked
 * and completed rows have been cleared. The caller only starts this sequence
 * for a game that is not over. A blocked spawn ends the game.
 *
 * @param state GameState after locking and clearing
 * @param nextTetromino Piece to make active
 * @returns New GameState with the next piece and its spawn outcome
 */
function spawn(state: GameState, nextTetromino: Tetromino): GameState {
  // Look if a new tetromino can fit in the grid.
  const spawnIsBlocked = !canPlace(state.board, nextTetromino);
  const eliminationReason = spawnIsBlocked ? "blocked-spawn" : null;

  const spawnedState: GameState = {
    ...state,
    tetromino: nextTetromino,
    gameOver: spawnIsBlocked,
    eliminationReason,
  };
  return spawnedState;
}

/**
 * # receivePenalties
 *
 * *Pure* function that inserts `count` indestructible rows at the bottom of
 * the board as soon as an opponent's clear is resolved.
 *
 * Settled blocks and
 * their colours shift up, and the active piece is lifted by the same amount,
 * so it keeps its position relative to the blocks and never overlaps a new
 * row. Blocks pushed off the top eliminate the player (penalty overflow).
 *
 * @param state Current GameState of the receiving player
 * @param count Nonnegative integer number of penalty rows
 * @returns `state` unchanged when there is nothing to apply, else a new GameState
 */
export function receivePenalties(state: GameState, count: number): GameState {
  if (count === 0 || state.gameOver) return state;
  const { board: penalizedBoard, overflow } = injectPenaltyLines(state.board, count);
  const insertedCount = Math.min(count, penalizedBoard.length);
  const remainingKinds = state.blockKinds.slice(insertedCount);
  const penaltyRows = penalizedBoard.slice(penalizedBoard.length - insertedCount);
  const penaltyKinds: BlockKinds = penaltyRows.map((row) => row.map(() => null));
  const shiftedKinds: BlockKinds = [...remainingKinds, ...penaltyKinds];
  const liftedTetromino = translate(state.tetromino, 0, -insertedCount);
  const nextEffectId = (state.boardEffect?.id ?? 0) + 1;
  const penaltyEffect: BoardEffect = {
    id: nextEffectId,
    clearedRows: [],
    insertedRows: insertedCount,
    lockedBoard: state.board,
    lockedKinds: state.blockKinds,
  };
  const eliminationReason = overflow ? "penalty-overflow" : null;

  const penalizedState: GameState = {
    ...state,
    board: penalizedBoard,
    blockKinds: shiftedKinds,
    tetromino: liftedTetromino,
    boardEffect: penaltyEffect,
    gameOver: overflow,
    eliminationReason,
  };
  return penalizedState;
}

/**
 * # tick
 *
 * *Pure* function that advances the active tetromino by one row if it fits.
 * Otherwise it locks the piece, clears complete destructible rows, and spawns
 * the supplied next tetromino. Penalties are not applied here: see
 * `receivePenalties`, which inserts them as soon as they are sent.
 *
 * A piece that cannot fall while still above the board causes a lock-out.
 * A blocked next spawn also ends the game.
 *
 * Writing into newly copied rows is local mutation: the input state remains
 * unchanged, and the same inputs produce the same result. Purity does not
 * require avoiding local variables or mutation of fresh, unshared data.
 *
 * @param state Current GameState
 * @param nextTetromino Piece to spawn if the active piece locks
 * @returns `GameTransition`, with locked true only when a piece was settled
 */
export function tick(
  state: GameState,
  nextTetromino: Tetromino,
): GameTransition {
  if (state.gameOver) return { state, locked: false };

  const fallen = translate(state.tetromino, 0, 1);

  if (canPlace(state.board, fallen)) {
    const fallenState: GameState = { ...state, tetromino: fallen };
    return { state: fallenState, locked: false };
  }

  // Cannot lock a piece with cells above the board: this causes lock-out.
  const pieceCells = getCellsOnBoard(state.tetromino);
  const pieceExtendsAboveBoard = pieceCells.some(([, y]) => y < 0);
  if (pieceExtendsAboveBoard) {
    const eliminatedState: GameState = {
      ...state,
      gameOver: true,
      eliminationReason: "lock-out",
    };
    return { state: eliminatedState, locked: false };
  }

  // Basic tetris flow: lock, clear, spawn.
  const lockedState = lockPiece(state);
  const clearedState = clearCompletedRows(lockedState);
  const nextState = spawn(clearedState, nextTetromino);

  return { state: nextState, locked: true };
}

/**
 * # hardDrop
 *
 * *Pure* function that moves the active piece to its lowest valid position,
 * then uses tick to lock it and handle line clears and the next piece.
 * Reassigning the local current variable does not mutate the input state.
 * Calling tick preserves purity because tick is also pure.
 *
 * @param state Current GameState
 * @param nextTetromino Piece to spawn after locking
 * @returns `GameTransition`, or the unchanged state with locked false if already over
 */
export function hardDrop(
  state: GameState,
  nextTetromino: Tetromino,
): GameTransition {
  if (state.gameOver) return { state, locked: false };
  let current = state;
  while (canPlace(current.board, translate(current.tetromino, 0, 1))) {
    current = move(current, 0, 1);
  }
  return tick(current, nextTetromino);
}
