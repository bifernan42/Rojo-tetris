import {
  TETROMINO_KINDS as PIECE_KINDS
} from '../engine/tetrominoes';

import type {
  TetrominoKind as PieceKind
} from '../engine/tetrominoes';

/**
 * # PieceSequence
 * 
 * The full tetromino sequence common to all
 * players during a tetris game.
 * 
 * This garantees a fair gameplay, by giving the
 * same sequence of Pieces to all players, regardless
 * of their respective speed.
 */
export class PieceSequence {
  /**
   * # sequence
   * 
   * Every time the most advanced player needs 
   * an index that is out of bounds, the sequence
   * grows by + 7.
   * 
   * Since each player reads their tetromino and next
   * tetromino in this sequence, they all share a
   * *common tetromino history*.
   */
  private sequence: PieceKind[] = [];

  /**
   * # PieceSequence
   * 
   * We register a default random number generator
   */
  constructor(
    private readonly random: () => number = Math.random
  ) {}

  /**
   * # generateBag
   * 
   * This method uses a shuffling algorithm based on the random
   * number generated upon construction.
   * You reverse iterate through the bag's item and you swap
   * element i with element j, where j is floor(r * (i + 1))
   * 
   * Doing that n times where n is array length gives You
   * a shuffled array.
   * 
   * lien du melange [Fisher Yates](https://fr.wikipedia.org/wiki/Mélange_de_Fisher-Yates)
   * 
   * @example
   * - s = [I, O, T, L, J, Z, S];
   * - i = 6; 
   * - r = 0.48;
   * 
   * - s[i] = S
   * - j = floor(0.48 * (6 + 1)) = 3
   * - s[j] = L
   * - s = [I, O, T, S, J, Z, L]
   * 
   */
  private generateBag(): void {
    const bag = [...PIECE_KINDS];

    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      const a = bag[i]!;
      const b = bag[j]!;
      
      bag[i] = b;
      bag[j] = a;
    }

    this.sequence.push(...bag);
  }

  /** 
   * # at
   * 
   * This method searches sequence[index],
   * if it is not found, a new tetromino
   * bag is generated and added to the inner
   * tetromino sequence.
   * 
   * The sequence is grown by the most advanced player
   * the ones that are behind just read the sequence 
   * and that's all.
   * 
   */
  at(index: number): PieceKind {
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new Error('Invalid piece index');
    }

    // if requesting a bigger index, you just regenerate
    // a new bag and pour it into the sequence 
    while (this.sequence.length <= index) {
      this.generateBag();
    }

    const kind = this.sequence[index];
    
    if (kind === undefined) {
      throw new Error('Piece generation failed');
    }
    
    return kind;
  }
}
