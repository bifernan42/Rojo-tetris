import type { Server, Socket } from "socket.io";
import { Player } from "./Player";
import { Room } from "./Room";
import {
  SocketEvent,
  type PlayerIdentity,
  type PlayerMove,
} from "../common/protocol";
import type { RoomGameManager } from "./RoomGameManager";

const MAX_NAME_LENGTH = 30;

/**
 * # validateAndTrimName
 *
 * This function returns the cleaned name or null
 * we simply remove the spaces left and right, then check if it has some length
 */
function validateAndTrimName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= MAX_NAME_LENGTH ? name : null;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * # PlayerRequestHandler
 *
 * This class receives the players' requests and keeps the players and rooms.
 * It asks Room and Game to apply the rules,
 * then uses the game manager to send updates and manage the timers.
 */
export class PlayerRequestHandler {
  private readonly players = new Map<string, Player>();
  private readonly rooms = new Map<string, Room>();

  constructor(
    private readonly io: Server,
    private readonly gameManager: RoomGameManager,
  ) {}

  /**
   * # registerEvents
   *
   * This method installs the connection handler, call it once at server startup.
   * Each new socket gets its own event callbacks.
   */
  registerEvents(): void {
    this.io.on("connection", (socket) => this.registerSocketEvents(socket));
  }

  // Look through the rooms to find the one containing this player.
  private findPlayerRoom(playerId: string): Room | undefined {
    return [...this.rooms.values()].find((room) => room.players.has(playerId));
  }

  /**
   * # runCommandForPlayerRoom
   *
   * This method is used to get a player's
   * room if he's in, it then applies the command
   * sent by the player
   *
   *
   * @param socket
   * @param fallback
   * @param command
   * @returns
   */
  private runCommandForPlayerRoom(
    socket: Socket,
    fallback: string,
    command: (room: Room) => void,
  ): void {
    const room = this.findPlayerRoom(socket.id);

    if (!room) {
      socket.emit(SocketEvent.gameError, "You are not in a room");
      return;
    }

    try {
      command(room);
    } catch (error) {
      socket.emit(SocketEvent.gameError, errorMessage(error, fallback));
    }
  }

  /**
   * # registerSocketEvents
   *
   * This method connects each socket event to the method that handles it.
   * The arrow callbacks keep this pointing to our handler instance.
   */
  private registerSocketEvents(socket: Socket): void {
    socket.emit(SocketEvent.hello, "New conection");

    socket.on(SocketEvent.registerPlayer, (value: unknown) => {
      this.registerPlayer(socket, value);
    });
    socket.on(SocketEvent.joinRoom, (roomName: unknown, intent?: unknown) => {
      this.joinRoom(socket, roomName, intent);
    });
    socket.on(SocketEvent.startGame, () => {
      this.startGame(socket);
    });
    socket.on(SocketEvent.gameAction, (action: PlayerMove) => {
      this.applyPlayerMove(socket, action);
    });
    socket.on(SocketEvent.restartGame, () => {
      this.restartGame(socket);
    });
    socket.on(SocketEvent.setHardMode, (value: unknown) => {
      this.setHardMode(socket, value);
    });
    socket.on("disconnect", () => {
      this.disconnectPlayer(socket);
    });
  }

  // Validate name upon registration, creates a new player
  // adds it to the players collection upon success
  private registerPlayer(socket: Socket, value: unknown): void {
    const name = validateAndTrimName(value);
    if (!name) {
      socket.emit(SocketEvent.playerError, "Invalid player name");
      return;
    }
    // edge case if already in room
    if (this.findPlayerRoom(socket.id)) {
      socket.emit(
        SocketEvent.playerError,
        "Leave your current room before registering again",
      );
      return;
    }
    const player = new Player(socket.id, name);
    //adds the new Player to the Player collection, key = socket id
    this.players.set(socket.id, player);
    const identity: PlayerIdentity = { id: player.id, name: player.name };
    socket.emit(SocketEvent.playerRegistered, identity);
  }

  // Handle the room logic, based on who's requesting
  // our simplification is that player id is socket.id
  private joinRoom(socket: Socket, roomName: unknown, intent?: unknown): void {
    const player = this.players.get(socket.id);
    if (!player) {
      socket.emit(SocketEvent.roomError, "user should be registered first");
      return;
    }
    // good both for players and room names
    const name = validateAndTrimName(roomName);
    if (!name) {
      socket.emit(SocketEvent.roomError, "Bad room name");
      return;
    }
    // request that corresponds to nothing
    if (intent !== undefined && intent !== "create" && intent !== "join") {
      socket.emit(SocketEvent.roomError, "Invalid room action");
      return;
    }
    // you can join or create if you are not in a room already
    if (this.findPlayerRoom(socket.id)) {
      socket.emit(SocketEvent.roomError, "player already in a room");
      return;
    }
    // can't create a room that already exists
    let room = this.rooms.get(name);
    if (intent === "create" && room) {
      socket.emit(SocketEvent.roomError, "Room already exists");
      return;
    }
    // valid intent & bad room : can't join what does not exist
    if (intent === "join" && !room) {
      socket.emit(SocketEvent.roomError, "Room not found");
      return;
    }
    // create room if it does not exist
    if (!room) {
      room = new Room(name);
      this.rooms.set(name, room);
    }
    // add player, broadcast the room
    try {
      room.addPlayer(player);
      socket.join(this.gameManager.getRoomChannelName(room));
      this.gameManager.broadcastRoom(room);
    } catch (error) {
      socket.emit(
        SocketEvent.roomError,
        errorMessage(error, "Cannot join room"),
      );
    }
  }

  // run the start game event
  private startGame(socket: Socket): void {
    this.runCommandForPlayerRoom(socket, "Cannot start game", (room) => {
      room.start(socket.id);
      this.gameManager.sendInitialStatesAndStartTimer(room);
    });
  }

  // apply a move if the game is playing
  private applyPlayerMove(socket: Socket, action: PlayerMove): void {
    const room = this.findPlayerRoom(socket.id);
    if (!room || room.status !== "PLAYING" || !room.game) return;
    if (room.game.getState(socket.id)?.gameOver) return;
    try {
      room.game.applyPlayerMove(socket.id, action);
      this.gameManager.finishRoomGameIfOver(room);
      this.gameManager.broadcastGame(room);
    } catch {
      socket.emit(SocketEvent.gameError, "Invalid game action");
    }
  }

  // after a game has finished, player can send the replay request
  private restartGame(socket: Socket): void {
    this.runCommandForPlayerRoom(socket, "Cannot restart game", (room) => {
      room.restart(socket.id);
      this.gameManager.stopGameTimer(room);
      this.gameManager.sendInitialStatesAndStartTimer(room);
    });
  }

  // possibility to set the hard mode
  private setHardMode(socket: Socket, value: unknown): void {
    this.runCommandForPlayerRoom(socket, "Cannot change hard mode", (room) => {
      if (typeof value !== "boolean")
        throw new Error("Invalid hard mode value");
      room.setHardMode(socket.id, value);
      this.gameManager.broadcastRoom(room);
    });
  }

  // disconnection handling
  private disconnectPlayer(socket: Socket): void {
    this.players.delete(socket.id);
    const room = this.findPlayerRoom(socket.id);
    if (!room) return;
    room.disconnectPlayer(socket.id);
    if (room.players.size === 0) {
      this.gameManager.stopGameTimer(room);
      this.rooms.delete(room.name);
      return;
    }
    // obviously stop the timer when a game's finished
    if (room.status === "FINISHED") this.gameManager.stopGameTimer(room);
    this.gameManager.broadcastGame(room);
    this.gameManager.broadcastRoom(room);
  }
}
