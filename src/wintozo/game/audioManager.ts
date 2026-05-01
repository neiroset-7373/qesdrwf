// Global Audio Manager for Spidi Clicker v3.0

const TRACKS = [
  'https://cdn.jsdelivr.net/gh/neiroset-7373/music/spidi_music.mp3',
  'https://cdn.jsdelivr.net/gh/neiroset-7373/music/click.mp3',
];

let audioInstance: HTMLAudioElement | null = null;
let currentTrack = 0;
let isEnabled = true;

export function initAudio(trackIndex: number, enabled: boolean): void {
  isEnabled = enabled;
  currentTrack = trackIndex;
  if (!enabled) return;

  if (audioInstance) {
    audioInstance.pause();
    audioInstance = null;
  }

  const audio = new Audio(TRACKS[trackIndex] || TRACKS[0]);
  audio.loop = true;
  audio.volume = 0.3;
  audioInstance = audio;

  if (enabled) {
    audio.play().catch(() => {
      // Autoplay blocked, will play on user interaction
    });
  }
}

export function startAudioOnInteraction(): void {
  if (!isEnabled || !audioInstance) return;
  if (audioInstance.paused) {
    audioInstance.play().catch(() => {});
  }
}

export function setMusicEnabled(enabled: boolean): void {
  isEnabled = enabled;
  if (!audioInstance) {
    if (enabled) initAudio(currentTrack, enabled);
    return;
  }
  if (enabled) {
    audioInstance.play().catch(() => {});
  } else {
    audioInstance.pause();
  }
}

export function setTrack(trackIndex: number): void {
  currentTrack = trackIndex;
  if (!audioInstance) return;
  const wasPlaying = !audioInstance.paused;
  audioInstance.pause();
  audioInstance.src = TRACKS[trackIndex] || TRACKS[0];
  if (wasPlaying && isEnabled) {
    audioInstance.play().catch(() => {});
  }
}

export function previewTrack(trackIndex: number, duration = 5000): void {
  const preview = new Audio(TRACKS[trackIndex] || TRACKS[0]);
  preview.volume = 0.3;
  preview.play().catch(() => {});
  setTimeout(() => {
    preview.pause();
    preview.src = '';
  }, duration);
}

export function getTrackNames(): string[] {
  return ['Неофициальная мелодия', 'Spidi Мелодия'];
}

export function getTracks(): string[] {
  return TRACKS;
}
