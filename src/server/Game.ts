import {
  createGame,
  move,
  rotate,
  hardDrop,
  tick,
  receivePenalties,
} from "../engine/game";
import type { GameState, GameTransition } from "../engine/game";
import type { Player } from "./Player";
import type { PlayerMove } from "../common/protocol";
import { PieceSequence } from "./PieceSequence";
import { Piece } from "./Piece";

/**
 * # Game
 *
 * This class is the server side representation of the game.
 * It serves as a wrapper around the pure engine. And translates
 * PlayerMoves to concrete transformations in the engine.
 *
 * It keeps track of each player game state in `states`
 * It holds the common sequence of tetrominoes (Pieces) used by all players in `sequence`
 * It also keep tracks of player's next piece index in `nextIndex`
 */
export class Game {
  // string is player id, gamestate is the state returned by the engine
  // when game moves/actions are applied
  readonly states = new Map<string, GameState>();
  // Sequence holds the sequence of all tetrominoes used in the game
  readonly sequence = new PieceSequence();
  // string is the player id, number is the next piece index of sequence
  private readonly nextIndex = new Map<string, number>();

  /**
   * # Game Constructor
   *
   * For each player we create a GameState, starting with the first
   * tetromino of the sequence
   * and set the next index to one for everybody
   * at this point, inner sequence length is 7
   *
   * @param players
   */
  constructor(players: Iterable<Player>) {
    for (const player of players) {
      this.states.set(player.id, createGame(this.pieceAt(0)));
      this.nextIndex.set(player.id, 1);
    }
  }

  /**
   * # pieceAt
   *
   * This method is used to read the index-th
   * piece from the sequence and make it spawn on the grid.
   *
   * If the index is bigger than the sequence lenght,
   * then the sequence is exetended with 7 shuffled pieces
   * (see `./PieceSequence.ts`)
   * @param index -> the requested piece index
   * @returns `Piece`
   */
  private pieceAt(index: number) {
    return new Piece(this.sequence.at(index)).spawn();
  }

  /**
   * # getNextPiece
   *
   * This getter method is used to read a Player's
   * next `Piece`, based on his id and his advancement
   * in the sequence array.
   *
   *
   * @param playerId
   * @returns
   */
  getNextPiece(playerId: string) {
    const index = this.nextIndex.get(playerId);
    if (index === undefined) throw new Error("Unknown player");
    return this.pieceAt(index);
  }

  /**
   * # updatePlayerStateAndCountPenalties
   *
   * This well named method replaces the
   * previous Player's state with a new one,
   *
   * based on game advancement and player's action
   *
   * The GameTransition parameter is a wrapper
   * for a GameState
   *
   *
   * @param playerId
   * @param transition
   * @returns
   */
  private updatePlayerStateAndCountPenalties(
    playerId: string,
    transition: GameTransition,
  ): number {
    // get previous state
    const previous = this.states.get(playerId)!;
    // replace by the new one
    this.states.set(playerId, transition.state);
    // if the piece is locked, we advance the next index
    if (transition.locked) {
      this.nextIndex.set(playerId, this.nextIndex.get(playerId)! + 1);
    }
    // return the penalties count : = nb of lines cleared  -1
    return Math.max(0, transition.state.lines - previous.lines - 1);
  }

  /**
   * # getState
   *
   * getter for one player's state
   *
   * @param playerId
   * @returns
   */
  getState(playerId: string): GameState | undefined {
    return this.states.get(playerId);
  }

  /**
   * # playerCount
   *
   * Getter for the number of players
   */
  get playerCount(): number {
    return this.states.size;
  }

  /**
   * # eliminate
   *
   * Eliminate the player upon disconnection
   * @param playerId
   * @param reason
   */
  eliminate(playerId: string, reason: "disconnected"): void {
    const state = this.states.get(playerId);
    if (state)
      this.states.set(playerId, {
        ...state,
        gameOver: true,
        eliminationReason: reason,
      });
  }

  /**
   * # applyPlayerMove
   *
   * This method translates players moves comming
   * from the network into calls to the pure engine
   * transformation system, it handles :
   * - `soft drops`
   * - `rotation (clockwise)`
   * - translation `(left/right)`
   * - `hard drops`
   *
   * And returns the resulting GameState
   *
   * PLease note that those works only if the piece isn't locked
   *
   * @param playerId
   * @param action
   * @returns `GameState`
   */
  applyPlayerMove(playerId: string, action: PlayerMove): GameState {
    const state = this.states.get(playerId);
    if (!state) throw new Error("Player has no active game");
    let transition: GameTransition;
    switch (action) {
      case "MOVE_LEFT":
        transition = { state: move(state, -1, 0), locked: false };
        break;
      case "MOVE_RIGHT":
        transition = { state: move(state, 1, 0), locked: false };
        break;
      case "ROTATE_RIGHT":
        transition = { state: rotate(state), locked: false };
        break;
      case "SOFT_DROP":
        transition = { state: move(state, 0, 1), locked: false };
        break;
      case "HARD_DROP":
        transition = hardDrop(state, this.getNextPiece(playerId));
        break;
      default:
        throw new Error("Unknown game action");
    }
    const penalty = this.updatePlayerStateAndCountPenalties(
      playerId,
      transition,
    );
    this.distributePenalties(playerId, penalty);
    return transition.state;
  }

  /**
   * # advanceAllPlayersOneStep
   *
   * This method calls the tick function to advance
   * the game, it also applies any penalties caused by other players
   */
  advanceAllPlayersOneStep(): void {
    const attacks: { senderId: string; count: number }[] = [];
    for (const [playerId, state] of this.states) {
      if (state.gameOver) continue;
      const transition = tick(state, this.getNextPiece(playerId));
      // for one player, we record the id (sender) and it's attack
      // you clear one line, this is 0
      attacks.push({
        senderId: playerId,
        count: this.updatePlayerStateAndCountPenalties(playerId, transition),
      });
    }
    // 1 wait tick to finish, 2 apply attacks
    // All players finish this tick before its attacks reach any board.
    for (const { senderId, count } of attacks)
      this.distributePenalties(senderId, count);
  }

  /**
   * # distributePenalties
   *
   * The method used to distribute the penalties
   * to all players, except for the attacker
   * @param senderId
   * @param count
   * @returns
   */
  private distributePenalties(senderId: string, count: number): void {
    if (count === 0) return;
    for (const [playerId, state] of this.states) {
      // you can't attack yourself
      if (playerId === senderId || state.gameOver) continue;
      this.states.set(playerId, receivePenalties(state, count));
    }
  }
}
