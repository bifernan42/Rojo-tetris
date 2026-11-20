import { useEffect, useRef } from 'react';
import menuMusic from '../../music/01. MUSIC-1.mp3';
import gameMusic from '../../music/03. MUSIC-2.mp3';

export default function BackgroundMusic({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const track = playing ? gameMusic : menuMusic;

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.src = track;
    const play = () => {
      if (audio.paused) void audio.play().catch(() => {
        // Autoplay can be blocked; retry on the next user interaction.
      });
    };
    play();
    document.addEventListener('pointerdown', play);
    document.addEventListener('touchend', play);
    document.addEventListener('keydown', play);
    return () => {
      audio.pause();
      document.removeEventListener('pointerdown', play);
      document.removeEventListener('touchend', play);
      document.removeEventListener('keydown', play);
    };
  }, [track]);

  return <audio ref={ref} loop preload="none" />;
}
