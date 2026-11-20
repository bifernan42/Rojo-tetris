import type { GameState } from "../engine/game";
import type { Tetromino } from "../engine/tetrominoes";

/**
 * # ScoreEntry
 *
 * A piece of information representing
 * a player's name and score during a game.
 * It is stored locally in a database
 * and diplayed in the top 10 view
 * if the score is high enough
 */
export type ScoreEntry = { name: string; score: number };

/** Player identity shared by registration and room membership. */
export type PlayerIdentity = { id: string; name: string };

/**  # PlayerMove
 *
 * This is a literal union type, summarizes all possible
 * moves a Player can make  during a game
 **/
export type PlayerMove =
  "MOVE_LEFT" | "MOVE_RIGHT" | "ROTATE_RIGHT" | "SOFT_DROP" | "HARD_DROP";

/**
 * # PlayerSpectrum
 *
 * The representation of the openent spectrum,
 * containing the playerId, name, and current
 * tetris `skyline`
 */
export type PlayerSpectrum = {
  playerId: string;
  name: string;
  heights: number[];
};

/** Lifecycle of a room: lobby, game running, game over (waiting for a restart). */
export type RoomStatus = "WAITING" | "PLAYING" | "FINISHED";

/** Optional menu intent sent with `room:join`; the /:room/:player URL sends none. */
export type RoomIntent = "create" | "join";

/** Host-only commands on a room's game. */
export type GameCommand = "start" | "restart";

/**
 * # SocketEvent
 *
 * Every socket.io event name shared by client and server.
 * This is the set of all type of messages we use in the
 * custom protocol
 */
export const SocketEvent = {
  hello: "server:hello",
  registerPlayer: "player:register",
  playerRegistered: "player:registered",
  playerError: "player:error",
  joinRoom: "room:join",
  roomState: "room:state",
  roomError: "room:error",
  startGame: "game:start",
  restartGame: "game:restart",
  gameAction: "game:action",
  gameState: "game:state",
  gameSpectra: "game:spectra",
  gameError: "game:error",
  setHardMode: "room:hardMode",
} as const;

/** Event emitted for each host command. */
export const GAME_COMMAND_EVENTS: Record<GameCommand, string> = {
  start: SocketEvent.startGame,
  restart: SocketEvent.restartGame,
};

/**
 * # RoomState
 *
 * The representation of a room's state
 * it is the source of truth used to manage rooms,
 * lifecycles
 */
export type RoomState = {
  name: string;
  hostId: string | null;
  winnerId: string | null;
  winnerName: string | null;
  status: RoomStatus;
  players: PlayerIdentity[];
  hardMode: boolean;
};

/**
 * # Server side snapshot of a game,
 * since the server is responsible for
 * broadcasting room & game state to the
 * clients, it associates GameState from
 * the pure engine and metadata :
 * - score
 * - nextTetromino
 * - elapsed
 */
export type GameSnapshot = GameState & {
  nextTetromino: Tetromino | null;
  score: number;
  elapsedMs: number;
};
