import type { GameSnapshot, RoomState } from '../../common/protocol';
import NextTetromino from './NextTetromino';

type GameInfoProps = {
  game: GameSnapshot;
  room: RoomState;
  playerId: string | undefined;
  name: string;
};

export default function GameInfo({ game, room, playerId, name }: GameInfoProps) {
  const seconds = Math.floor(game.elapsedMs / 1000);
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const result = room.status === 'FINISHED'
    ? room.players.length <= 1 && !room.winnerId ? 'Game over'
      : room.winnerId === playerId ? 'You won!' : room.winnerId ? 'You lost' : 'Draw'
    : game.gameOver ? 'Game over' : '';

  return (
    <>
      <h2 className="gc-title player-name" title={name}>{name}</h2>
      <div className="game-info">
        <div className="game-stats">
          <p className="game-stat">Score <strong>{game.score}</strong></p>
          <p className="game-stat">Lines <strong>{game.lines}</strong></p>
          <p className="game-stat">Time <strong>{time}</strong></p>
        </div>
        <div className="game-result" role="status">
          {result && <p className="gc-title preview-game-over">{result}</p>}
        </div>
      </div>
      <div className="preview-slot">
        <NextTetromino tetromino={!game.gameOver && room.status === 'PLAYING' ? game.nextTetromino : null} />
      </div>
    </>
  );
}
