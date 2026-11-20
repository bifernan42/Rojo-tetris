import { createTetromino } from '../engine/tetrominoes';
import type { Tetromino, TetrominoKind } from '../engine/tetrominoes';
import { translate } from '../engine/transformations';

/**
 * # Piece
 * 
 * The server side class wrapper for the tetris engine's
 * pure tetrominos, it is only used to spawn the Pieces
 * that fall from the sky
 */
export class Piece {
  constructor(readonly kind: TetrominoKind) {}

  /**
   * # spawn
   * 
   * This method is used to... make Pieces spawn during the game
   * by calling the pure engine's `createTetromino` function
   * and `translate` to have them in the up middle of the `Board` 
   * @returns 
   */
  spawn(): Tetromino {
    return translate(createTetromino(this.kind), this.kind === 'I' || this.kind === 'L' ? 3 : 4, 0);
  }
}
