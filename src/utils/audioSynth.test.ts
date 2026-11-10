import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSynthesizer } from './audioSynth';
import { SoundPreset } from '../types/studio';

const mockPreset: SoundPreset = {
  id: 'test_jump',
  name: 'Jump Sound',
  category: 'jump',
  type: 'square',
  startFreq: 150,
  endFreq: 600,
  duration: 0.25,
  attack: 0.02,
  decay: 0.1,
  sustain: 0.3,
  release: 0.1,
  pitchJump: 4,
  distortion: 0.1,
  noise: 0.05,
  volume: 0.8,
  createdAt: 1000
};

test('AudioSynthesizer generates valid WAV buffer with correct RIFF header', () => {
  const buffer = AudioSynthesizer.generateWavBuffer(mockPreset);
  assert.ok(buffer instanceof ArrayBuffer);
  assert.ok(buffer.byteLength > 44, 'Buffer must be larger than 44 bytes (header size)');

  const view = new DataView(buffer);
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  assert.equal(riff, 'RIFF');

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  assert.equal(wave, 'WAVE');

  const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
  assert.equal(fmt, 'fmt ');

  // PCM format is 1
  assert.equal(view.getUint16(20, true), 1);
  // 1 channel
  assert.equal(view.getUint16(22, true), 1);
  // 44100 sample rate
  assert.equal(view.getUint32(24, true), 44100);
  // 16 bits per sample
  assert.equal(view.getUint16(34, true), 16);
});

test('AudioSynthesizer generates standalone runnable JS code', () => {
  const code = AudioSynthesizer.generateCode(mockPreset);
  assert.ok(code.includes('AudioContext'));
  assert.ok(code.includes('playJump_Sound'));
  assert.ok(code.includes('createOscillator'));
  assert.ok(code.includes('square'));
});
