import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import updateClientState from './clientState';
import { handleServerCommunication, type ClientSocket } from './handleServerCommunication';

export function createClientState(socket?: ClientSocket) {
  return configureStore({
    reducer: updateClientState,
    middleware: (getDefault) => getDefault().concat(handleServerCommunication(socket)),
  });
}

export type ClientStateManager = ReturnType<typeof createClientState>;
export type ClientState = ReturnType<ClientStateManager['getState']>;
export type SendClientAction = ClientStateManager['dispatch'];

export const useClientActions = useDispatch.withTypes<SendClientAction>();
export const useClientState = useSelector.withTypes<ClientState>();
