// Web Audio API Retro 8-bit Sound Synthesizer

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function setAudioEnabled(enabled: boolean) {
  soundEnabled = enabled;
  try {
    localStorage.setItem('jobing_sound_enabled', enabled ? 'true' : 'false');
  } catch {}
}

export function isAudioEnabled(): boolean {
  try {
    const saved = localStorage.getItem('jobing_sound_enabled');
    if (saved !== null) {
      soundEnabled = saved === 'true';
    }
  } catch {}
  return soundEnabled;
}

export function playDinoJumpSound(): void {
  if (!isAudioEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    // Frequency ramp for classic 8-bit jump/pickup sound
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.14);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch {
    // Ignore audio errors gracefully
  }
}
