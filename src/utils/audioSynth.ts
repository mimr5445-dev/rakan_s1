import { SoundPreset } from '../types/studio';

class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play sound preset live using Web Audio API
  public play(preset: SoundPreset): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const duration = Math.max(0.05, preset.duration);

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = preset.type || 'sine';

      // Frequency Ramp
      const startFreq = Math.max(20, preset.startFreq);
      const endFreq = Math.max(20, preset.endFreq);
      osc.frequency.setValueAtTime(startFreq, now);

      if (preset.pitchJump !== 0) {
        // Pitch jump in semitones midpoint
        const midTime = now + duration * 0.3;
        const jumpFactor = Math.pow(2, preset.pitchJump / 12);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, startFreq * jumpFactor), midTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      } else {
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      }

      // Envelope ADSR
      const attack = Math.min(duration * 0.4, preset.attack);
      const decay = Math.min(duration * 0.4, preset.decay);
      const sustainLevel = Math.max(0.001, preset.sustain * preset.volume);
      const masterVol = Math.max(0.01, preset.volume);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(masterVol, now + attack);
      gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Noise generator for punchy explosions / hits
      if (preset.noise > 0.05) {
        const bufferSize = ctx.sampleRate * duration;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(preset.noise * preset.volume * 0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        whiteNoise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now);
        whiteNoise.stop(now + duration);
      }

      // Connect and fire
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Generate pure WAV file buffer for download
  public static generateWavBuffer(preset: SoundPreset): ArrayBuffer {
    const sampleRate = 44100;
    const numChannels = 1;
    const duration = Math.max(0.1, preset.duration);
    const numSamples = Math.floor(sampleRate * duration);
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bitsPerSample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Synthesis loop
    let offset = 44;
    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Frequency interpolation
      const currentFreq = preset.startFreq + (preset.endFreq - preset.startFreq) * progress;
      phase += (2 * Math.PI * currentFreq) / sampleRate;

      // Base Waveform
      let sample = 0;
      switch (preset.type) {
        case 'square':
          sample = Math.sin(phase) >= 0 ? 0.7 : -0.7;
          break;
        case 'sawtooth':
          sample = ((phase / (2 * Math.PI)) % 1) * 2 - 1;
          break;
        case 'triangle':
          sample = Math.asin(Math.sin(phase)) * (2 / Math.PI);
          break;
        case 'sine':
        default:
          sample = Math.sin(phase);
          break;
      }

      // Noise addition
      if (preset.noise > 0) {
        sample = sample * (1 - preset.noise) + (Math.random() * 2 - 1) * preset.noise;
      }

      // Envelope ADSR
      let envelope = 0;
      if (t < preset.attack) {
        envelope = preset.attack > 0 ? t / preset.attack : 1;
      } else if (t < preset.attack + preset.decay) {
        const decayTime = t - preset.attack;
        const decayProgress = preset.decay > 0 ? decayTime / preset.decay : 1;
        envelope = 1 - (1 - preset.sustain) * decayProgress;
      } else {
        const releaseTime = t - (preset.attack + preset.decay);
        const remaining = duration - (preset.attack + preset.decay);
        const releaseProgress = remaining > 0 ? releaseTime / remaining : 1;
        envelope = preset.sustain * (1 - Math.min(1, releaseProgress));
      }

      // Distortion clamp
      let val = sample * envelope * preset.volume;
      if (preset.distortion > 0) {
        val = Math.max(-1, Math.min(1, val * (1 + preset.distortion * 3)));
      }

      // Clamp to 16-bit integer
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(val * 32767)));
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return buffer;
  }

  // Generate standalone downloadable WAV Blob
  public static generateWavBlob(preset: SoundPreset): Blob {
    const buffer = AudioSynthesizer.generateWavBuffer(preset);
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Generate runnable JavaScript code snippet for this sound
  public static generateCode(preset: SoundPreset): string {
    return `// ==========================================
// OmniStudio Audio Engine - Procedural Sound
// Sound: ${preset.name} (${preset.category})
// ==========================================

function play${preset.name.replace(/[^a-zA-Z0-9]/g, '_')}() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  const duration = ${preset.duration};

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = '${preset.type}';
  osc.frequency.setValueAtTime(${preset.startFreq}, now);
  ${preset.pitchJump !== 0 ? `osc.frequency.exponentialRampToValueAtTime(${preset.startFreq} * Math.pow(2, ${preset.pitchJump} / 12), now + ${preset.duration * 0.3});` : ''}
  osc.frequency.exponentialRampToValueAtTime(${preset.endFreq}, now + duration);

  const attack = ${preset.attack};
  const decay = ${preset.decay};
  const sustain = ${preset.sustain * preset.volume};
  const vol = ${preset.volume};

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(vol, now + attack);
  gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

// Trigger sound:
// play${preset.name.replace(/[^a-zA-Z0-9]/g, '_')}();
`;
  }
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const audioSynth = new AudioSynthesizer();
export { AudioSynthesizer };
