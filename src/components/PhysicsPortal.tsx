import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Download,
  Code2,
  Sparkles,
  Flame,
  Wind,
  Layers,
  CircleDot,
  Square
} from 'lucide-react';
import { PhysicsPreset, PhysicsBody } from '../types/studio';
import { PhysicsEngine } from '../utils/physicsEngine';
import { CodeModal } from './CodeModal';

interface PhysicsPortalProps {
  presets: PhysicsPreset[];
  activePresetId: string;
  onSelectPreset: (id: string) => void;
  onUpdatePresets: (presets: PhysicsPreset[]) => void;
  language: 'ar' | 'en';
}

export const PhysicsPortal: React.FC<PhysicsPortalProps> = ({
  presets,
  activePresetId,
  onSelectPreset,
  onUpdatePresets,
  language
}) => {
  const isAr = language === 'ar';
  const activePreset = presets.find((p) => p.id === activePresetId) || presets[0];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);

  // Initialize Physics Engine
  useEffect(() => {
    if (!activePreset) return;
    const engine = new PhysicsEngine(activePreset, 800, 480);
    engineRef.current = engine;
  }, [activePreset.id]);

  // Main Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!isPaused) {
            engine.step(dt);
          }

          // Draw Canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Grid Lines
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Draw Bodies
          engine.bodies.forEach((b) => {
            ctx.fillStyle = b.color;
            ctx.strokeStyle = '#ffffff55';
            ctx.lineWidth = 2;

            if (b.type === 'circle') {
              ctx.beginPath();
              ctx.arc(b.x, b.y, b.radius || 20, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Rolling indicator
              ctx.fillStyle = '#ffffff88';
              ctx.beginPath();
              ctx.arc(b.x + (b.radius || 20) * 0.4, b.y - (b.radius || 20) * 0.4, 4, 0, Math.PI * 2);
              ctx.fill();
            } else {
              const w = b.width || 40;
              const h = b.height || 40;
              ctx.beginPath();
              ctx.roundRect(b.x - w / 2, b.y - h / 2, w, h, 8);
              ctx.fill();
              ctx.stroke();
            }
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  const handleUpdatePreset = (patch: Partial<PhysicsPreset>) => {
    if (!activePreset) return;
    const updated = presets.map((p) => (p.id === activePreset.id ? { ...p, ...patch } : p));
    onUpdatePresets(updated);
    if (engineRef.current) {
      if (patch.gravity !== undefined) engineRef.current.gravity = patch.gravity;
      if (patch.wind !== undefined) engineRef.current.wind = patch.wind;
      if (patch.airResistance !== undefined) engineRef.current.airResistance = patch.airResistance;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#a855f7'];
    const newBody: PhysicsBody = {
      id: 'body_' + Date.now(),
      type: Math.random() > 0.4 ? 'circle' : 'box',
      x,
      y,
      vx: (Math.random() - 0.5) * 350,
      vy: -180 - Math.random() * 200,
      radius: 18 + Math.random() * 14,
      width: 36,
      height: 36,
      mass: 1 + Math.random(),
      restitution: 0.8,
      friction: 0.05,
      color: colors[Math.floor(Math.random() * colors.length)]
    };

    engineRef.current.addBody(newBody);
  };

  const handleSpawnCircle = () => {
    if (!engineRef.current) return;
    const colors = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b'];
    engineRef.current.addBody({
      id: 'circ_' + Date.now(),
      type: 'circle',
      x: 100 + Math.random() * 600,
      y: 60,
      vx: (Math.random() - 0.5) * 200,
      vy: 0,
      radius: 22 + Math.random() * 12,
      mass: 1.2,
      restitution: 0.85,
      friction: 0.04,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  };

  const handleSpawnBox = () => {
    if (!engineRef.current) return;
    const colors = ['#ec4899', '#f43f5e', '#a855f7'];
    engineRef.current.addBody({
      id: 'box_' + Date.now(),
      type: 'box',
      x: 100 + Math.random() * 600,
      y: 60,
      vx: (Math.random() - 0.5) * 150,
      vy: 0,
      width: 40,
      height: 40,
      mass: 2,
      restitution: 0.65,
      friction: 0.1,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  };

  const handleExplosion = () => {
    if (!engineRef.current) return;
    const centerX = 400;
    const centerY = 240;
    engineRef.current.bodies.forEach((b) => {
      const dx = b.x - centerX;
      const dy = b.y - centerY;
      const dist = Math.hypot(dx, dy) || 1;
      const force = 800;
      b.vx += (dx / dist) * force;
      b.vy += (dy / dist) * force;
    });
  };

  const handleResetSimulation = () => {
    if (engineRef.current && activePreset) {
      engineRef.current.loadPreset(activePreset);
    }
  };

  const handleDownloadSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `physics_${activePreset.id}_snapshot.png`;
    a.click();
  };

  const handleImportCode = (rawText: string) => {
    try {
      if (rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText) as PhysicsPreset;
        const newPreset: PhysicsPreset = {
          id: 'phys_' + Date.now(),
          name: parsed.name || (isAr ? 'محاكاة فيزيائية مستوردة' : 'Imported Physics'),
          description: parsed.description || '',
          gravity: Number(parsed.gravity) || 980,
          airResistance: Number(parsed.airResistance) || 0.001,
          wind: Number(parsed.wind) || 0,
          bodies: parsed.bodies || []
        };
        onUpdatePresets([newPreset, ...presets]);
        onSelectPreset(newPreset.id);
      }
    } catch (e) {
      console.warn('Physics import error:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'بوابة الحركة الفيزيائية ومحاكي التصادم' : 'Physics & Collision Simulation Portal'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'صندوق رمل فيزيائي ثنائي الأبعاد للأجسام الصلبة والجاذبية مع تصدير الصور والأكواد البرمجية المستقلة'
              : '2D Rigid body physics sandbox with dynamic collisions, gravity sliders, image snapshot, and standalone code export'}
          </p>
        </div>

        {/* Global Physics Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const newPreset: PhysicsPreset = {
                id: 'phys_' + Date.now(),
                name: isAr ? 'محاكاة مخصصة جديدة' : 'Custom Simulation',
                description: '',
                gravity: 980,
                airResistance: 0.001,
                wind: 0,
                bodies: [
                  {
                    id: 'b_' + Date.now(),
                    type: 'circle',
                    x: 400,
                    y: 100,
                    vx: 50,
                    vy: 0,
                    radius: 25,
                    mass: 1,
                    restitution: 0.8,
                    friction: 0.05,
                    color: '#6366f1'
                  }
                ]
              };
              onUpdatePresets([newPreset, ...presets]);
              onSelectPreset(newPreset.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'مشهد فيزيائي جديد' : 'New Preset'}</span>
          </button>

          <button
            onClick={() => {
              setIsImportMode(true);
              setCodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'استيراد كود فيزيائي' : 'Import Code'}</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {presets.map((p) => {
          const isSelected = p.id === activePreset.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                isSelected
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Sandbox Interactive Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas Display (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          {/* Top Controls on Canvas */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isPaused ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? (isAr ? 'استئناف' : 'Resume') : isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
              </button>
              <button
                onClick={handleResetSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="إعادة ضبط المشهد"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            </div>

            {/* Shape Spawners & Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleSpawnCircle}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
              >
                <CircleDot className="w-3.5 h-3.5" />
                <span>+ كرة</span>
              </button>
              <button
                onClick={handleSpawnBox}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>+ صندوق</span>
              </button>
              <button
                onClick={handleExplosion}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer"
                title="إطلاق موجة تفجيرية تدفع الأجسام"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{isAr ? 'موجة تفجير' : 'Blast'}</span>
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={800}
              height={480}
              onClick={handleCanvasClick}
              className="w-full h-[400px] block"
            />
            <div className="absolute top-3 left-3 text-[11px] font-semibold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 pointer-events-none">
              {isAr ? '💡 اضغط في أي مكان على الشاشة لإطلاق أجسام فيزيائية' : '💡 Click anywhere to spawn physics objects'}
            </div>
          </div>

          {/* Export bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-mono">
              الأجسام النشطة: {engineRef.current?.bodies.length || 0}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'تحميل كصورة (PNG)' : 'Download Image'}</span>
              </button>
              <button
                onClick={() => {
                  setIsImportMode(false);
                  setCodeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>{isAr ? 'تصدير كود المحاكاة' : 'Export Code'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Settings Panel (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-200">{activePreset.name}</h3>
            <p className="text-xs text-slate-400 mt-1">{activePreset.description}</p>
          </div>

          {/* Gravity Slider */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">{isAr ? 'تسارع الجاذبية (Gravity)' : 'Gravity (Y)'}</span>
              <span className="text-purple-400 font-mono">{activePreset.gravity} px/s²</span>
            </div>
            <input
              type="range"
              min="-400"
              max="2500"
              step="20"
              value={activePreset.gravity}
              onChange={(e) => handleUpdatePreset({ gravity: Number(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{isAr ? 'طفو معاكس' : 'Reverse'}</span>
              <span>{isAr ? 'صفر' : 'Zero-G'}</span>
              <span>{isAr ? 'جاذبية ثقيلة' : 'Heavy'}</span>
            </div>
          </div>

          {/* Wind Slider */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAr ? 'الرياح الأفقية (Wind)' : 'Horizontal Wind'}</span>
              </span>
              <span className="text-cyan-400 font-mono">{activePreset.wind} px/s²</span>
            </div>
            <input
              type="range"
              min="-800"
              max="800"
              step="20"
              value={activePreset.wind}
              onChange={(e) => handleUpdatePreset({ wind: Number(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Air Resistance Slider */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">{isAr ? 'مقاومة الهواء (Air Drag)' : 'Air Resistance'}</span>
              <span className="text-emerald-400 font-mono">{(activePreset.airResistance * 1000).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.02"
              step="0.001"
              value={activePreset.airResistance}
              onChange={(e) => handleUpdatePreset({ airResistance: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Code Modal */}
      <CodeModal
        isOpen={codeModalOpen}
        title={isImportMode ? (isAr ? 'استيراد مشهد فيزيائي من كود' : 'Import Physics Code') : `${activePreset.name} - HTML5 Canvas Code`}
        code={isImportMode ? '' : PhysicsEngine.generateCode(activePreset)}
        language="html"
        filename={`${activePreset.id}_physics.html`}
        isImportMode={isImportMode}
        onClose={() => setCodeModalOpen(false)}
        onImport={handleImportCode}
      />
    </div>
  );
};
