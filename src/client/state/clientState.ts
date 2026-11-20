import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GameCommand, GameSnapshot, PlayerMove, PlayerSpectrum, RoomIntent, RoomState } from '../../common/protocol';

export type PendingAction = 'register' | 'join' | 'hardMode' | GameCommand | null;
export type Connection = 'connecting' | 'connected' | 'disconnected';
/** Which screen is shown: the main menu, or the room (lobby and game). */
export type CurrentScreen = 'menu' | 'room';

export type SessionState = {
  currentScreen: CurrentScreen;
  connection: Connection;
  playerId: string | undefined;
  game: GameSnapshot | null;
  registeredName: string;
  room: RoomState | null;
  error: string;
  pending: PendingAction;
  spectra: PlayerSpectrum[];
};

export const initialState: SessionState = {
  currentScreen: 'menu',
  connection: 'connecting',
  playerId: undefined,
  game: null,
  registeredName: '',
  room: null,
  error: '',
  pending: null,
  spectra: [],
};

/**
 * Pure session state. Reducers never touch the socket:
 * the network side effects live in handleServerCommunication.
 */
const clientStateDefinition = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setCurrentScreen(state, action: PayloadAction<CurrentScreen>) {
      state.currentScreen = action.payload;
    },

    // --- Intentions (UI -> server). handleServerCommunication performs the emit. ---
    connect(state, _action: PayloadAction<{ urlRoom?: string | undefined; urlPlayer?: string | undefined }>) {
      state.connection = 'connecting';
    },
    disconnect() {},
    resetSession() {
      return initialState;
    },
    registerPlayer(state, _action: PayloadAction<string>) {
      state.error = '';
      state.pending = 'register';
    },
    joinRoom(state, _action: PayloadAction<{ roomName: string; intent?: RoomIntent }>) {
      state.error = '';
      state.pending = 'join';
    },
    sendGameCommand(state, action: PayloadAction<GameCommand>) {
      state.error = '';
      state.pending = action.payload;
    },
    setHardMode(state, _action: PayloadAction<boolean>) {
      state.error = '';
      state.pending = 'hardMode';
    },
    sendMove(_state, _action: PayloadAction<PlayerMove>) {},

    // --- Received (server -> UI). Dispatched by handleServerCommunication. ---
    connected(state, action: PayloadAction<string | undefined>) {
      state.connection = 'connected';
      state.playerId = action.payload;
    },
    disconnected(state) {
      state.connection = 'disconnected';
      state.pending = null;
    },
    connectFailed(state) {
      state.connection = 'disconnected';
      state.pending = null;
      state.error = 'Cannot reach the server. Return to the menu to try again.';
    },
    registered(state, action: PayloadAction<string>) {
      state.registeredName = action.payload;
      state.pending = null;
    },
    roomStateReceived(state, action: PayloadAction<RoomState>) {
      state.room = action.payload;
      state.pending = null;
      state.error = '';
    },
    gameStateReceived(state, action: PayloadAction<GameSnapshot>) {
      // Snapshot is replaced wholesale; its readonly arrays never get mutated.
      (state as SessionState).game = action.payload;
    },
    spectraReceived(state, action: PayloadAction<PlayerSpectrum[]>) {
      state.spectra = action.payload;
    },
    errorReceived(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.pending = null;
    },
  },
});

export const {
  setCurrentScreen, connect, disconnect, resetSession, registerPlayer, joinRoom, sendGameCommand, sendMove,
  connected, disconnected, connectFailed, registered, roomStateReceived, gameStateReceived,
  spectraReceived, errorReceived, setHardMode,
} = clientStateDefinition.actions;

export default clientStateDefinition.reducer;

export const canSendPlayerMoves = (s: SessionState) =>
  s.connection === 'connected' && s.room?.status === 'PLAYING' && s.game !== null && !s.game.gameOver;

export const areSessionRequestsBlocked = (s: SessionState) =>
  s.connection !== 'connected' || s.pending !== null;
