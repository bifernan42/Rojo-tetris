import MenuButtons from '../MenuButtons';
import type { RoomState } from '../../common/protocol';

type RoomPanelProps = {
  room: RoomState;
  playerId: string | undefined;
  participated: boolean;
  disabled: boolean;
  onStart: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onToggleHardMode: () => void;
};

export default function RoomPanel({
  room, playerId, participated, disabled, onStart, onRestart, onMenu, onToggleHardMode,
}: RoomPanelProps) {
  const host = room.hostId === playerId;
  const waiting = room.status === 'WAITING';
  const finished = room.status === 'FINISHED';

  function getStatusText(): string {
    if (!waiting && !finished) return ' ';
    if (!host) return 'Waiting for host';
    return waiting ? 'Ready to start' : 'Ready to replay';
  }

  return (
    <section className="room-panel">
      {waiting && <>
        <h2 className="gc-title room-name">{room.name}</h2>
        <ul className="player-list">
          {room.players.map(player => (
            <li className="player-name" key={player.id}>
              {player.name}{player.id === room.hostId ? ' (Host)' : ''}
            </li>
          ))}
        </ul>
      </>}
      {finished && !participated && <p className="gc-title" role="status">Round finished</p>}
      <p className="room-status" role="status">
        {getStatusText()}
      </p>
      <button
        className="gc-button"
        disabled={disabled || !host || room.status === 'PLAYING'}
        aria-pressed={room.hardMode}
        onClick={onToggleHardMode}
      >
        Hard mode: {room.hardMode ? 'ON' : 'OFF'}
      </button>
      <MenuButtons
        primary={waiting ? {
          label: 'Start game', disabled: disabled || !host, onClick: onStart,
        } : {
          label: 'Replay', disabled: disabled || !finished || !host, onClick: onRestart,
        }}
        onMenu={onMenu}
      />
    </section>
  );
}
