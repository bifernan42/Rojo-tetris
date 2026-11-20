import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import RoomPanel from './room/RoomPanel';
import OpponentsPanel from './game/OpponentsPanel';
import AnimatedGameBoard from './game/AnimatedGameBoard';
import GameInfo from './game/GameInfo';
import MenuButtons from './MenuButtons';
import ScreenScale from './mobile/ScreenScale';
import MainMenu from './menu/MainMenu';
import RoomForms from './room/RoomForms';
import { TouchControls } from './mobile/TouchControls';
import { KeyboardControls } from './game/KeyboardControls';
import useGameSession from './hooks/useGameSession';
import useGameKeyboard from './hooks/useGameKeyboard';
import BackgroundMusic from './BackgroundMusic';
import Leaderboard from './menu/Leaderboard';
import FallingTetrominoes from './menu/FallingTetrominoes';

export default function App() {
  const { roomName: urlRoom, playerName: urlPlayer } = useParams<{
    roomName: string;
    playerName: string;
  }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const {
    currentScreen, setCurrentScreen, connection, playerId, game, registeredName, room, error, spectra,
    canPlay, disabled, resetSession, registerPlayer, joinRoom, sendMove, sendGameCommand, setHardMode,
  } = useGameSession(urlRoom, urlPlayer);
  useGameKeyboard(canPlay);

  const showBoard = game !== null && room !== null && room.status !== 'WAITING';

  // Once in a room, reflect it in the URL (/:room/:player) so the link can be shared or reloaded.
  const joinedRoom = room?.name;
  useEffect(() => {
    if (!joinedRoom || !registeredName) return;
    if (joinedRoom === urlRoom && registeredName === urlPlayer) return;
    navigate(`/${encodeURIComponent(joinedRoom)}/${encodeURIComponent(registeredName)}`, { replace: true });
  }, [joinedRoom, registeredName, urlRoom, urlPlayer, navigate]);

  function goToMenu() {
    resetSession();
    setName('');
    setRoomName('');
    navigate('/');
  }

  function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    registerPlayer(name);
  }

  function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    joinRoom(roomName, submitter?.value === 'create' ? 'create' : 'join');
  }

  return (
    <main className={`gc-screen ${currentScreen === 'menu' ? 'main-menu' : showBoard ? 'game-screen' : 'room-screen'}`}>
      <BackgroundMusic playing={showBoard} />
      {currentScreen === 'menu' && !showLeaderboard && <FallingTetrominoes />}
      <ScreenScale width={currentScreen === 'menu' ? 520 : showBoard ? 690 : 380}>
        <header className="console-header"><h1>RED TETRIS</h1></header>
        <div className={`console-shell gc-panel ${!showBoard ? 'gc-panel--dialog' : ''} ${showBoard ? `console-shell--game console-shell--${currentScreen}` : ''}`}>
          {currentScreen === 'menu' ? (
            showLeaderboard ? <Leaderboard onMenu={() => setShowLeaderboard(false)} />
              : <MainMenu onPlay={() => setCurrentScreen('room')} onLeaderboard={() => setShowLeaderboard(true)} />
          ) : <>
            {connection === 'connecting' && <p className="gc-help" role="status">Connecting...</p>}
            {connection === 'disconnected' && (
              <p className="gc-help" role="alert">Disconnected. Return to Menu to reconnect.</p>
            )}

            {!room && <RoomForms
              urlRoom={urlRoom} urlPlayer={urlPlayer} registeredName={registeredName}
              name={name} roomName={roomName} disabled={disabled}
              onNameChange={setName} onRoomNameChange={setRoomName}
              onRegisterSubmit={handleRegisterSubmit} onRoomSubmit={handleRoomSubmit}
            />}

            {error && <p className="gc-help" role="alert">{error}</p>}
            <div className={showBoard ? 'game-layout' : 'room-layout'}>
              {showBoard && game && room && (
                <section className="player-board" aria-label="Your game">
                  <AnimatedGameBoard game={game} />
                  <TouchControls canPlay={canPlay} onAction={sendMove} />
                </section>
              )}
              <aside className="session-panel" aria-label="Game information and menu">
                {showBoard && game && room && <GameInfo
                  game={game} room={room} playerId={playerId}
                  name={registeredName || urlPlayer || 'Your game'}
                />}
                {room && <RoomPanel
                  room={room} playerId={playerId} participated={game !== null} disabled={disabled}
                  onStart={() => sendGameCommand('start')}
                  onRestart={() => sendGameCommand('restart')}
                  onMenu={goToMenu}
                  onToggleHardMode={() => setHardMode(!room.hardMode)}
                />}
                {!room && <MenuButtons onMenu={goToMenu} />}
              </aside>
              {showBoard && room && (
                <OpponentsPanel room={room} playerId={playerId} spectra={spectra} />
              )}

            </div>
            {showBoard && <KeyboardControls />}
          </>}
        </div>
      </ScreenScale>
    </main>
  );
}
