import type { Player } from './Player';
import { Game } from './Game';
import type { RoomStatus } from '../common/protocol';

export type { RoomStatus };

/**
 * # Room
 * 
 * What is a room ?
 * 
 * It's a collection of 1 to N Players that want to play tetris
 * One of which is the host (host have power over the room)
 * A room has a state : 
 * - waiting
 * - playing
 * - finished
 * it hosts ONE game of tetris, common to all players
 * it holds metadata about the game such as :
 * - startedAt
 * - finishedAt
 * - winnerId
 * - winnerName
 * 
 * And it allows the player to play the hardMode if host wants to. 
 */  
export class Room {
  constructor(public readonly name: string) {}

  readonly players = new Map<string, Player>();
  hostId: string | null = null;
  status: RoomStatus = 'WAITING';
  game: Game | null = null;
  startedAt = 0;
  finishedAt: number | null = null;
  winnerId: string | null = null;
  winnerName: string | null = null;
  hardMode = false;


  /**
   * # finishIfOver
   * 
   * This method updates the room's status from
   * PLAYING to FINISHED when those conditions are met :
   * 
   * - The state was : PLAYING
   * - Everybody is game over or there's one player still standing that is not gameOver
   * @returns true when it updated status to FINISHED, else false 
   */
  finishIfOver(): boolean {
    
    if (this.status !== 'PLAYING' || !this.game) return false;
    const survivors = [...this.players.keys()].filter(id => {
      const state = this.game!.getState(id);
      return state !== undefined && !state.gameOver;
    });
    
    // This works both for solo and multiplayer, if you are the survivor, then you are not
    // gameover, then you keep PLAYING, there could be no survivors at all too.
    const finished = this.game.playerCount === 1 ? survivors.length === 0 : survivors.length <= 1;

    if (!finished) return false;

    // Update Room state
    this.winnerId = survivors[0] ?? null;
    this.winnerName = this.winnerId ? this.players.get(this.winnerId)!.name : null;
    this.status = 'FINISHED';
    this.finishedAt = Date.now();
    return true;
  }

  /**
   * # addPlayer
   * 
   * This method tries to add a Player to the Room,
   * this works only if the status is not PLAYING,
   * otherwise, the player as to wait until the
   * game finishes.
   * 
   * If there's no Host, then the joining player becomes the Host
   * 
   * @param player 
   */
  addPlayer(player: Player): void {
    if (this.status === 'PLAYING') throw new Error('Game already started');
    this.players.set(player.id, player);
    if (this.hostId === null) this.hostId = player.id;
  }

  /**
   * # removePlayer
   * 
   * This method is used to remove a Player from the room
   * if the player was the host, then we try to attribute
   * the host title to the next player in the room.
   * 
   * If there's no player left, the room is hostless
   * @param playerId 
   */
  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    if (this.hostId === playerId) {
      this.hostId = this.players.keys().next().value ?? null;
    }
  }

  /**
   * # start
   * 
   * Changes the room state from WAITING to PLAYING
   *  
   * Safe wrapper to launch the game (permission wise)
   * 
   * This method is used to launch the game, it is
   * triggered by the host. This action simply cannot
   * be done by any other player than the host
   * @param playerId 
   */
  start(playerId: string): void {
    if (this.hostId !== playerId) throw new Error('Only Host Allowed');
    if (this.status !== 'WAITING') throw new Error('Game already started');
    this.launch();
  }

  /**
   * # start
   * 
   * Changes the room state from FINISHED to PLAYING 
   *
   * Almost the same method as `start`, but it's a gamedev madeleine de proust
   * to have it.
   * 
   * @param playerId 
   */
  restart(playerId: string): void {
    if (this.hostId !== playerId) throw new Error('Only host can restart');
    if (this.status !== 'FINISHED') throw new Error('Game is not finished');
    this.launch();
  }

  /**
   * # launch()
   * 
   * Sets the room state to PLAYING and starts a game
   * with all players in the room.
   */
  private launch(): void {
    this.game = new Game(this.players.values());
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.winnerId = null;
    this.winnerName = null;
    this.status = 'PLAYING';
  }

  /**
   * # disconnectPlayer
   * 
   * This method removes a player that disconnected during the game
   * 
   * it also checks if the game is over
   * @param playerId 
   * @returns 
   */
  disconnectPlayer(playerId: string): void {
    if (!this.players.has(playerId)) return;
    if (this.status === 'PLAYING' && this.game) {
      this.game.eliminate(playerId, 'disconnected');
      this.finishIfOver();
    }
    this.removePlayer(playerId);
  }

  /**
   * # setHardMode
   * 
   * This method allows the host to set the hard hardMode
   * when the game is not PLAYING
   * @param playerId 
   * @param enabled 
   */
  setHardMode(playerId: string, enabled: boolean): void {
    if (this.hostId !== playerId) throw new Error('Only Host Allowed');
    if (this.status === 'PLAYING') throw new Error('Game already started');
    this.hardMode = enabled;
  }
}
