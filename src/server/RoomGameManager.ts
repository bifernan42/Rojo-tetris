import type { Server } from "socket.io";
import type { Room } from "./Room";
import type { Game } from "./Game";
import {
  SocketEvent,
  type GameSnapshot,
  type PlayerSpectrum,
  type RoomState,
  type ScoreEntry,
} from "../common/protocol";
import { getSpectrum } from "../engine/spectrum";

export const NORMAL_TICK_MS = 500;
export const HARD_TICK_MS = 100;

/**
 * # RoomGameManager
 *
 * This class contains the methods necessary to manage the rooms' games,
 * those methods are called by the player request handler.
 * It keeps the game timers and remembers the scores already saved.
 * One manager is shared by all rooms on the server.
 */
export class RoomGameManager {
  private readonly gameTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly savedScores = new WeakMap<Game, Map<string, number>>();

  constructor(
    private readonly io: Server,
    private readonly saveScore: (entry: ScoreEntry) => void,
  ) {}

  // Keep named rooms separate from Socket.IO's per-socket channels.
  getRoomChannelName(room: Room): string {
    return `room:${room.name}`;
  }

  /**
   * # broadcastRoom
   *
   * this method sends event to the other players.
   * It advertises the current room state
   * to all players in the room.
   *
   * @param room
   */
  broadcastRoom(room: Room): void {
    const state: RoomState = {
      name: room.name,
      hostId: room.hostId,
      status: room.status,
      winnerId: room.winnerId,
      winnerName: room.winnerName,
      hardMode: room.hardMode,
      players: [...room.players.values()].map((player) => ({
        id: player.id,
        name: player.name,
      })),
    };
    this.io.to(this.getRoomChannelName(room)).emit(SocketEvent.roomState, state);
  }

  /**
   * # sendPlayersTheirGameState
   *
   * This method creates a current gameState
   * snapshot and advertises it to the right
   * player
   *
   * @param room
   * @param game
   */
  private sendPlayersTheirGameState(room: Room, game: Game): void {
    let saved = this.savedScores.get(game);
    if (!saved) this.savedScores.set(game, (saved = new Map()));
    for (const player of room.players.values()) {
      const state = game.getState(player.id);
      if (!state) continue;
      const snapshot: GameSnapshot = {
        ...state,
        score: state.lines * 100,
        elapsedMs: Math.max(
          0,
          (room.finishedAt ?? Date.now()) - room.startedAt,
        ),
        nextTetromino: state.gameOver ? null : game.getNextPiece(player.id),
      };
      // Save earned points immediately, including before a player disconnects.
      if (snapshot.score > (saved.get(player.id) ?? 0)) {
        try {
          const entry: ScoreEntry = {
            name: player.name,
            score: snapshot.score,
          };
          this.saveScore(entry);
          saved.set(player.id, snapshot.score);
        } catch (error) {
          console.error("Cannot save score:", error);
        }
      }
      this.io.to(player.id).emit(SocketEvent.gameState, snapshot);
    }
  }

  /**
   * # broadcastSpectra
   *
   * This method is used to broadcast the players spectra
   * @param room
   * @param game
   */
  private broadcastSpectra(room: Room, game: Game): void {
    const spectra: PlayerSpectrum[] = [...room.players.values()].flatMap(
      (player) => {
        const state = game.getState(player.id);
        return state
          ? [
              {
                playerId: player.id,
                name: player.name,
                heights: getSpectrum(state.board),
              },
            ]
          : [];
      },
    );
    this.io.to(this.getRoomChannelName(room)).emit(SocketEvent.gameSpectra, spectra);
  }

  /**
   * # broadcastGame
   *
   * This method is used to advertise to all players
   * in the room their gameState and the opponents
   * spectra.
   *
   * @param room
   * @returns
   */
  broadcastGame(room: Room): void {
    if (!room.game) return;
    this.sendPlayersTheirGameState(room, room.game);
    this.broadcastSpectra(room, room.game);
  }

  /**
   * # stopGameTimer
   *
   * This method stops the game timer upon
   * game's end
   * @param room
   */
  stopGameTimer(room: Room): void {
    const timer = this.gameTimers.get(room.name);
    if (timer !== undefined) clearInterval(timer);
    this.gameTimers.delete(room.name);
  }

  /**
   * # finishRoomGameIfOver
   *
   * finishes the game if the game is gameOver
   * (call `finishIfOver`) + advertising
   * @param room
   * @returns
   */
  finishRoomGameIfOver(room: Room): void {
    if (!room.finishIfOver()) return;
    this.stopGameTimer(room);
    this.broadcastRoom(room);
  }

  /**
   * # startGameTimer
   *
   * this method sets the timer based on
   * the selected game difficulty, calls the
   * ticker's caller `advanceAllPlayersOneStep`
   * if game isn't finished, it then advertises
   * the gamestate and the roomstate to the players
   *
   * @param room
   * @returns
   */
  private startGameTimer(room: Room): void {
    if (!room.game || this.gameTimers.has(room.name)) return;
    const tickRate = room.hardMode ? HARD_TICK_MS : NORMAL_TICK_MS;
    this.gameTimers.set(
      room.name,
      setInterval(() => {
        if (!room.game || room.status !== "PLAYING") {
          this.stopGameTimer(room);
          return;
        }
        room.game.advanceAllPlayersOneStep();
        this.finishRoomGameIfOver(room);
        this.broadcastGame(room);
      }, tickRate),
    );
  }

  /**
   * # sendInitialStatesAndStartTimer
   *
   * First broadcast for the room & game states,
   * starts the timer too.
   * @param room
   */
  sendInitialStatesAndStartTimer(room: Room): void {
    this.broadcastGame(room);
    this.broadcastRoom(room);
    this.startGameTimer(room);
  }

  /**
   * # dispose
   *
   * This method stops all the timers when the manager is no longer needed.
   * It can be called when closing the server or cleaning up a test.
   */
  dispose(): void {
    for (const timer of this.gameTimers.values()) clearInterval(timer);
    this.gameTimers.clear();
  }
}
