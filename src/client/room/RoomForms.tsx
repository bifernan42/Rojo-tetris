import type { FormEventHandler } from 'react';

type RoomFormsProps = {
  urlRoom: string | undefined;
  urlPlayer: string | undefined;
  registeredName: string;
  name: string;
  roomName: string;
  disabled: boolean;
  onNameChange: (name: string) => void;
  onRoomNameChange: (name: string) => void;
  onRegisterSubmit: FormEventHandler<HTMLFormElement>;
  onRoomSubmit: FormEventHandler<HTMLFormElement>;
};

export default function RoomForms({
  urlRoom, urlPlayer, registeredName, name, roomName, disabled,
  onNameChange, onRoomNameChange, onRegisterSubmit, onRoomSubmit,
}: RoomFormsProps) {
  return <>
    {!urlPlayer && !registeredName ? (
      <form className="gc-content console-form" onSubmit={onRegisterSubmit}>
        <label className="gc-label" htmlFor="player-name">Your name</label>
        <input className="gc-input" id="player-name" value={name} onChange={event => onNameChange(event.target.value)} maxLength={30} required disabled={disabled} />
        <button className="gc-button gc-button--primary" type="submit" disabled={disabled}>Continue</button>
      </form>
    ) : !registeredName && <p role="status">Joining room...</p>}
    {!urlRoom && registeredName && (
      <form className="gc-content console-form" onSubmit={onRoomSubmit}>
        <label className="gc-label" htmlFor="room-name">Room name</label>
        <input className="gc-input" id="room-name" value={roomName} onChange={event => onRoomNameChange(event.target.value)} maxLength={30} required disabled={disabled} />
        <div className="menu-actions">
          <button className="gc-button gc-button--primary" type="submit" value="create" disabled={disabled}>Create room</button>
          <button className="gc-button gc-button--primary" type="submit" value="join" disabled={disabled}>Join room</button>
        </div>
      </form>
    )}
  </>;
}
