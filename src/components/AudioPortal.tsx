import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Plus,
  Trash2,
  Copy,
  Download,
  Code2,
  Music,
  Sliders,
  Sparkles
} from 'lucide-react';
import { SoundPreset } from '../types/studio';
import { audioSynth, AudioSynthesizer } from '../utils/audioSynth';
import { CodeModal } from './CodeModal';

interface AudioPortalProps {
  sounds: SoundPreset[];
  onUpdateSounds: (sounds: SoundPreset[]) => void;
  language: 'ar' | 'en';
}

export const AudioPortal: React.FC<AudioPortalProps> = ({
  sounds,
  onUpdateSounds,
  language
}) => {
  const isAr = language === 'ar';
  const [selectedId, setSelectedId] = useState<string>(sounds[0]?.id || '');
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeSound = sounds.find((s) => s.id === selectedId) || sounds[0];

  // Draw Waveform representation on Canvas
  useEffect(() => {
    if (!canvasRef.current || !activeSound) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw procedural waveform preview
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2;

    for (let x = 0; x < w; x++) {
      const progress = x / w;
      const freq = activeSound.startFreq + (activeSound.endFreq - activeSound.startFreq) * progress;
      const cycles = (freq / 80) * progress * 4;
      
      let wave = 0;
      if (activeSound.type === 'square') {
        wave = Math.sin(cycles * Math.PI * 2) >= 0 ? 0.8 : -0.8;
      } else if (activeSound.type === 'sawtooth') {
        wave = (cycles % 1) * 2 - 1;
      } else if (activeSound.type === 'triangle') {
        wave = Math.asin(Math.sin(cycles * Math.PI * 2)) * (2 / Math.PI);
      } else {
        wave = Math.sin(cycles * Math.PI * 2);
      }

      // Envelope modulation
      let env = 1;
      if (progress < 0.15) env = progress / 0.15;
      else env = Math.max(0.05, 1 - (progress - 0.15) / 0.85);

      const amp = wave * env * (h * 0.38) * activeSound.volume;
      const y = midY - amp;

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Add subtle glow
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [activeSound]);

  const handlePlaySound = (presetToPlay = activeSound) => {
    if (!presetToPlay) return;
    audioSynth.play(presetToPlay);
  };

  const handleUpdateActive = (patch: Partial<SoundPreset>) => {
    if (!activeSound) return;
    const updated = sounds.map((s) => (s.id === activeSound.id ? { ...s, ...patch } : s));
    onUpdateSounds(updated);
  };

  const handleAddNew = () => {
    const newSound: SoundPreset = {
      id: 'snd_' + Date.now(),
      name: isAr ? 'مؤثر صوتي مخصص' : 'Custom Sound',
      category: 'jump',
      type: 'sine',
      startFreq: 300,
      endFreq: 600,
      duration: 0.3,
      attack: 0.02,
      decay: 0.1,
      sustain: 0.3,
      release: 0.1,
      pitchJump: 0,
      distortion: 0.1,
      noise: 0,
      volume: 0.8,
      createdAt: Date.now()
    };
    onUpdateSounds([newSound, ...sounds]);
    setSelectedId(newSound.id);
  };

  const handleDuplicate = () => {
    if (!activeSound) return;
    const dup: SoundPreset = {
      ...activeSound,
      id: 'snd_' + Date.now(),
      name: `${activeSound.name} (نسخة)`
    };
    onUpdateSounds([dup, ...sounds]);
    setSelectedId(dup.id);
  };

  const handleDelete = () => {
    if (sounds.length <= 1) return;
    const filtered = sounds.filter((s) => s.id !== activeSound.id);
    onUpdateSounds(filtered);
    setSelectedId(filtered[0]?.id || '');
  };

  const handleDownloadWav = () => {
    if (!activeSound) return;
    const blob = AudioSynthesizer.generateWavBlob(activeSound);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSound.name.replace(/[^a-zA-Z0-9]/g, '_')}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCode = (rawText: string) => {
    try {
      // Attempt JSON parse first
      if (rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText);
        const importedSound: SoundPreset = {
          id: 'snd_imp_' + Date.now(),
          name: parsed.name || (isAr ? 'صوت مستورد' : 'Imported Sound'),
          category: parsed.category || 'jump',
          type: parsed.type || 'square',
          startFreq: Number(parsed.startFreq) || 400,
          endFreq: Number(parsed.endFreq) || 800,
          duration: Number(parsed.duration) || 0.3,
          attack: Number(parsed.attack) || 0.01,
          decay: Number(parsed.decay) || 0.1,
          sustain: Number(parsed.sustain) || 0.4,
          release: Number(parsed.release) || 0.1,
          pitchJump: Number(parsed.pitchJump) || 0,
          distortion: Number(parsed.distortion) || 0,
          noise: Number(parsed.noise) || 0,
          volume: Number(parsed.volume) || 0.8,
          createdAt: Date.now()
        };
        onUpdateSounds([importedSound, ...sounds]);
        setSelectedId(importedSound.id);
        return;
      }

      // If it's JS code, extract parameters via regex
      const startFreqMatch = rawText.match(/setValueAtTime\((\d+(\.\d+)?)/);
      const endFreqMatch = rawText.match(/exponentialRampToValueAtTime\((\d+(\.\d+)?)/);
      const durMatch = rawText.match(/duration\s*=\s*(\d+(\.\d+)?)/);
      const typeMatch = rawText.match(/type\s*=\s*['"](sine|square|sawtooth|triangle)['"]/);

      const parsedSound: SoundPreset = {
        id: 'snd_code_' + Date.now(),
        name: isAr ? 'صوت من كود برمجي' : 'Sound from Code',
        category: 'powerup',
        type: (typeMatch?.[1] as OscillatorType) || 'square',
        startFreq: startFreqMatch ? parseFloat(startFreqMatch[1]) : 240,
        endFreq: endFreqMatch ? parseFloat(endFreqMatch[1]) : 600,
        duration: durMatch ? parseFloat(durMatch[1]) : 0.35,
        attack: 0.02,
        decay: 0.1,
        sustain: 0.4,
        release: 0.1,
        pitchJump: 4,
        distortion: 0.1,
        noise: 0,
        volume: 0.8,
        createdAt: Date.now()
      };
      onUpdateSounds([parsedSound, ...sounds]);
      setSelectedId(parsedSound.id);
    } catch (e) {
      console.warn('Import error:', e);
    }
  };

  // Piano roll keys for pitch testing
  const pianoKeys = [
    { note: 'C4', freq: 261.63 },
    { note: 'D4', freq: 293.66 },
    { note: 'E4', freq: 329.63 },
    { note: 'F4', freq: 349.23 },
    { note: 'G4', freq: 392.0 },
    { note: 'A4', freq: 440.0 },
    { note: 'B4', freq: 493.88 },
    { note: 'C5', freq: 523.25 }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'بوابة المؤثرات الصوتية والمولد النغمي' : 'Audio SFX & Synthesizer Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'توليد مؤثرات صوتية للألعاب والوسائط التفاعلية مع معاينة فورية، تحميل ملفات WAV وتصدير كود حقيقي'
              : 'Synthesize procedural retro & modern game audio with live waveform visualizer, WAV download, and code export'}
          </p>
        </div>

        {/* Global Sound Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة مؤثر جديد' : 'New Sound'}</span>
          </button>
          <button
            onClick={() => {
              setIsImportMode(true);
              setCodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'إضافة من كود (Import)' : 'Import Code'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Preset Selector Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
            <span>{isAr ? 'المكتبة الصوتية' : 'Sound Library'}</span>
            <span className="text-slate-500 font-mono text-[11px]">{sounds.length} عناصر</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
            {sounds.map((snd) => {
              const isSelected = snd.id === activeSound?.id;
              return (
                <div
                  key={snd.id}
                  onClick={() => setSelectedId(snd.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySound(snd);
                      }}
                      className="w-8 h-8 rounded-lg bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      aria-label="تشغيل الصوت"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <div>
                      <div className="text-xs font-bold group-hover:text-white transition-colors">
                        {snd.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="uppercase text-cyan-400 font-mono">{snd.type}</span>
                        <span>•</span>
                        <span>{snd.duration.toFixed(2)}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Synthesizer & Waveform (8 cols) */}
        {activeSound && (
          <div className="lg:col-span-8 space-y-6">
            {/* Visualizer & Trigger Deck */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <input
                    type="text"
                    value={activeSound.name}
                    onChange={(e) => handleUpdateActive({ name: e.target.value })}
                    className="text-base font-bold text-white bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 w-full sm:w-80"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isAr ? 'اضغط لتشغيل الصوت ومعاينة النتيجة التفاعلية' : 'Trigger sound and preview visual waveform'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDuplicate}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    title="تكرار المؤثر"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={sounds.length <= 1}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 transition-colors disabled:opacity-40"
                    title="حذف المؤثر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Waveform Canvas */}
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={130}
                  className="w-full h-32 block rounded-lg"
                />
                <div className="absolute bottom-3 left-3 text-[10px] font-mono text-cyan-400 bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/20">
                  {activeSound.startFreq}Hz ➔ {activeSound.endFreq}Hz
                </div>
              </div>

              {/* Main Play & Export Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => handlePlaySound()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isAr ? 'تشغيل المؤثر الصوتي' : 'Play Sound'}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleDownloadWav}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{isAr ? 'تحميل كـ WAV' : 'Download WAV'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsImportMode(false);
                      setCodeModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span>{isAr ? 'عرض الكود البرمجي' : 'Export Code'}</span>
                  </button>
                </div>
              </div>

              {/* Pitch Tester Mini Piano */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isAr ? 'اختبار النغمات الموسيقية المباشرة:' : 'Pitch Scale Testing:'}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {pianoKeys.map((k) => (
                    <button
                      key={k.note}
                      onClick={() => {
                        handlePlaySound({
                          ...activeSound,
                          startFreq: k.freq,
                          endFreq: k.freq * (activeSound.endFreq / activeSound.startFreq)
                        });
                      }}
                      className="py-2 px-1 text-xs font-mono font-bold bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors text-center cursor-pointer"
                    >
                      {k.note}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Synthesizer Sliders & Parameters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>{isAr ? 'معايير التوليف والمذبذب' : 'Oscillator & Sound Controls'}</span>
              </div>

              {/* Waveform Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  {isAr ? 'شكل الموجة الصوتية (Oscillator Wave)' : 'Waveform'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map((wt) => (
                    <button
                      key={wt}
                      onClick={() => handleUpdateActive({ type: wt })}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all uppercase font-mono cursor-pointer ${
                        activeSound.type === wt
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {wt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Freq */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">{isAr ? 'التردد الابتدائي (Start Freq)' : 'Start Frequency'}</span>
                    <span className="text-cyan-400 font-mono">{activeSound.startFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="2000"
                    step="10"
                    value={activeSound.startFreq}
                    onChange={(e) => handleUpdateActive({ startFreq: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* End Freq */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">{isAr ? 'التردد النهائي (End Freq)' : 'End Frequency'}</span>
                    <span className="text-cyan-400 font-mono">{activeSound.endFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="2000"
                    step="10"
                    value={activeSound.endFreq}
                    onChange={(e) => handleUpdateActive({ endFreq: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Duration */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">{isAr ? 'مدة الصوت (Duration)' : 'Duration'}</span>
                    <span className="text-indigo-400 font-mono">{activeSound.duration.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="2.5"
                    step="0.05"
                    value={activeSound.duration}
                    onChange={(e) => handleUpdateActive({ duration: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Pitch Jump */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">{isAr ? 'قفزة النغمة (Pitch Jump)' : 'Pitch Jump (Semitones)'}</span>
                    <span className="text-indigo-400 font-mono">{activeSound.pitchJump}</span>
                  </div>
                  <input
                    type="range"
                    min="-24"
                    max="24"
                    step="1"
                    value={activeSound.pitchJump}
                    onChange={(e) => handleUpdateActive({ pitchJump: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Noise */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">{isAr ? 'خلط الضجيج (Noise / Blast)' : 'Noise Mix'}</span>
                    <span className="text-amber-400 font-mono">{Math.round(activeSound.noise * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={activeSound.noise}
                    onChange={(e) => handleUpdateActive({ noise: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Distortion */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">{isAr ? 'التشويه والتضخيم (Distortion)' : 'Distortion'}</span>
                    <span className="text-rose-400 font-mono">{Math.round(activeSound.distortion * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={activeSound.distortion}
                    onChange={(e) => handleUpdateActive({ distortion: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Code Modal */}
      {activeSound && (
        <CodeModal
          isOpen={codeModalOpen}
          title={isImportMode ? (isAr ? 'استيراد مؤثر صوتي من كود' : 'Import Sound from Code') : `${activeSound.name} - Web Audio Code`}
          code={isImportMode ? '' : AudioSynthesizer.generateCode(activeSound)}
          language="javascript"
          filename={`${activeSound.id}_sound.js`}
          isImportMode={isImportMode}
          onClose={() => setCodeModalOpen(false)}
          onImport={handleImportCode}
        />
      )}
    </div>
  );
};
