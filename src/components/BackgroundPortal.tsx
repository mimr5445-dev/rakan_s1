import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Download,
  Code2,
  Sparkles,
  Sun,
  CloudRain,
  Moon,
  Compass
} from 'lucide-react';
import { BackgroundPreset } from '../types/studio';
import { BackgroundRenderer } from '../utils/backgroundRenderer';
import { CodeModal } from './CodeModal';

interface BackgroundPortalProps {
  backgrounds: BackgroundPreset[];
  activeBackgroundId: string;
  onSelectBackground: (id: string) => void;
  onUpdateBackgrounds: (backgrounds: BackgroundPreset[]) => void;
  language: 'ar' | 'en';
}

export const BackgroundPortal: React.FC<BackgroundPortalProps> = ({
  backgrounds,
  activeBackgroundId,
  onSelectBackground,
  onUpdateBackgrounds,
  language
}) => {
  const isAr = language === 'ar';
  const activeBg = backgrounds.find((b) => b.id === activeBackgroundId) || backgrounds[0];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollSpeed, setScrollSpeed] = useState(1.5);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [manualOffset, setManualOffset] = useState(0);

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);

  // Render loop
  useEffect(() => {
    let animId: number;
    let offset = manualOffset;
    let time = 0;

    const loop = () => {
      time += 0.02;
      if (isAutoScroll) {
        offset += scrollSpeed;
      } else {
        offset = manualOffset;
      }

      if (canvasRef.current && activeBg) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          BackgroundRenderer.renderToCanvas(
            ctx,
            activeBg,
            canvasRef.current.width,
            canvasRef.current.height,
            offset,
            time
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeBg, isAutoScroll, scrollSpeed, manualOffset]);

  const handleUpdateActive = (patch: Partial<BackgroundPreset>) => {
    if (!activeBg) return;
    const updated = backgrounds.map((b) => (b.id === activeBg.id ? { ...b, ...patch } : b));
    onUpdateBackgrounds(updated);
  };

  const handleAddNew = () => {
    const newBg: BackgroundPreset = {
      id: 'bg_' + Date.now(),
      name: isAr ? 'خلفية مخصصة جديدة' : 'Custom Background',
      theme: 'cyberpunk',
      timeOfDay: 'night',
      weather: 'rain',
      weatherIntensity: 0.7,
      layers: []
    };
    onUpdateBackgrounds([newBg, ...backgrounds]);
    onSelectBackground(newBg.id);
  };

  const handleDuplicate = () => {
    if (!activeBg) return;
    const dup: BackgroundPreset = {
      ...activeBg,
      id: 'bg_' + Date.now(),
      name: `${activeBg.name} (نسخة)`
    };
    onUpdateBackgrounds([dup, ...backgrounds]);
    onSelectBackground(dup.id);
  };

  const handleDelete = () => {
    if (backgrounds.length <= 1) return;
    const filtered = backgrounds.filter((b) => b.id !== activeBg.id);
    onUpdateBackgrounds(filtered);
    onSelectBackground(filtered[0]?.id || '');
  };

  const handleDownloadSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${activeBg.id}_background.png`;
    a.click();
  };

  const handleImportCode = (rawText: string) => {
    try {
      if (rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText) as BackgroundPreset;
        const newBg: BackgroundPreset = {
          id: 'bg_' + Date.now(),
          name: parsed.name || (isAr ? 'خلفية مستوردة' : 'Imported Background'),
          theme: parsed.theme || 'cyberpunk',
          timeOfDay: parsed.timeOfDay || 'night',
          weather: parsed.weather || 'clear',
          weatherIntensity: Number(parsed.weatherIntensity) || 0.5,
          layers: []
        };
        onUpdateBackgrounds([newBg, ...backgrounds]);
        onSelectBackground(newBg.id);
      }
    } catch (e) {
      console.warn('Background import error:', e);
    }
  };

  const themes: BackgroundPreset['theme'][] = [
    'cyberpunk',
    'retro_synthwave',
    'fantasy_forest',
    'space_void',
    'desert_ruins'
  ];

  const weathers: BackgroundPreset['weather'][] = ['clear', 'rain', 'snow', 'sparks', 'fog'];
  const timesOfDay: BackgroundPreset['timeOfDay'][] = ['day', 'sunset', 'night', 'eclipse'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'بوابة العوالم والخلفيات التفاعلية' : 'Parallax Backgrounds & World Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'توليد خلفيات تفاعلية متعددة الطبقات (بارالاكس) ومحاكاة الطقس (مطر، ثلج، شرارات نارية) وتصدير كود اللعبة'
              : 'Multi-layer parallax world builder with weather simulation, celestial lighting, and canvas export'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'خلفية جديدة' : 'New Scene'}</span>
          </button>
          <button
            onClick={() => {
              setIsImportMode(true);
              setCodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>{isAr ? 'استيراد كود خلفية' : 'Import Code'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Backgrounds List (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
          <div className="text-xs font-bold text-slate-300 px-1 mb-2">
            {isAr ? 'عوالم الاستوديو' : 'World Presets'}
          </div>

          <div className="flex flex-col gap-1.5">
            {backgrounds.map((bg) => {
              const isSelected = bg.id === activeBg?.id;
              return (
                <div
                  key={bg.id}
                  onClick={() => onSelectBackground(bg.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500/50 text-teal-300 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-teal-400" />
                    <div>
                      <div className="text-xs font-bold">{bg.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{bg.theme.replace('_', ' ')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Live Parallax Canvas (9 cols) */}
        <div className="lg:col-span-9 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <input
                  type="text"
                  value={activeBg.name}
                  onChange={(e) => handleUpdateActive({ name: e.target.value })}
                  className="text-base font-bold text-white bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg focus:outline-none focus:border-teal-500 w-full sm:w-80"
                />
                <div className="text-[11px] text-slate-400 mt-1 capitalize">
                  {activeBg.theme.replace('_', ' ')} • {activeBg.timeOfDay} • {activeBg.weather}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicate}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="تكرار الخلفية"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={backgrounds.length <= 1}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors disabled:opacity-40"
                  title="حذف الخلفية"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Parallax Canvas */}
            <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800">
              <canvas
                ref={canvasRef}
                width={860}
                height={420}
                className="w-full h-[360px] block"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700 text-xs">
                <button
                  onClick={() => setIsAutoScroll(!isAutoScroll)}
                  className="text-teal-400 font-bold hover:underline cursor-pointer"
                >
                  {isAutoScroll ? (isAr ? 'إيقاف التحريك التلقائي' : 'Pause Auto-scroll') : isAr ? 'تشغيل التحريك' : 'Auto-scroll'}
                </button>
              </div>
            </div>

            {/* Export and Actions Bar */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold">{isAr ? 'سرعة البارالاكس:' : 'Scroll Speed:'}</span>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="w-28 accent-teal-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSnapshot}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isAr ? 'تحميل صورة عالية الدقة (PNG)' : 'Download PNG'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsImportMode(false);
                    setCodeModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isAr ? 'تصدير كود الخلفية' : 'Export Code'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Theme & Weather Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">
                {isAr ? 'طابع البيئة (Theme)' : 'Theme Preset'}
              </label>
              <div className="flex flex-col gap-1.5">
                {themes.map((th) => (
                  <button
                    key={th}
                    onClick={() => handleUpdateActive({ theme: th })}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-xl border text-right capitalize transition-all cursor-pointer ${
                      activeBg.theme === th
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {th.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather System */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAr ? 'نظام الطقس والجسيمات' : 'Weather & Particle FX'}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {weathers.map((w) => (
                  <button
                    key={w}
                    onClick={() => handleUpdateActive({ weather: w })}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center capitalize transition-all cursor-pointer ${
                      activeBg.weather === w
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Day */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'وقت اليوم والإضاءة' : 'Time of Day'}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {timesOfDay.map((tod) => (
                  <button
                    key={tod}
                    onClick={() => handleUpdateActive({ timeOfDay: tod })}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center capitalize transition-all cursor-pointer ${
                      activeBg.timeOfDay === tod
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {tod}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Modal */}
      <CodeModal
        isOpen={codeModalOpen}
        title={isImportMode ? (isAr ? 'استيراد خلفية من كود' : 'Import Background Code') : `${activeBg.name} - Parallax Canvas Code`}
        code={isImportMode ? '' : BackgroundRenderer.generateCode(activeBg)}
        language="html"
        filename={`${activeBg.id}_scene.html`}
        isImportMode={isImportMode}
        onClose={() => setCodeModalOpen(false)}
        onImport={handleImportCode}
      />
    </div>
  );
};
