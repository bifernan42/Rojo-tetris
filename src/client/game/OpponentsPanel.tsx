import type { PlayerSpectrum, RoomState } from '../../common/protocol';

type OpponentsPanelProps = {
  room: RoomState;
  playerId: string | undefined;
  spectra: PlayerSpectrum[];
};

export default function OpponentsPanel({
  room, playerId, spectra
}: OpponentsPanelProps) {
  return (
    <section className="opponents">
      <h2 className="gc-title">Opponents</h2>

      {spectra
        .filter(player => player.playerId !== playerId && room.players.some(p => p.id === player.playerId))
        .map(player => (
          <div className="opponent-display" key={player.playerId}>
            <h3 className="gc-label">{player.name}</h3>

            <div className="spectrum">
              {player.heights.map((height, x) => (
                <div className="spectrum-column" key={x}>
                  <div
                    className="spectrum-bar"
                    style={{ height: `${height * 5}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}
