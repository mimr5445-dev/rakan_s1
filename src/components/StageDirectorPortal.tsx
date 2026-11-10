import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Volume2,
  Sparkles,
  Download,
  Code2,
  RefreshCw,
  Flame,
  Zap,
  Maximize2
} from 'lucide-react';
import { StudioProject, PhysicsBody } from '../types/studio';
import { BackgroundRenderer } from '../utils/backgroundRenderer';
import { audioSynth } from '../utils/audioSynth';
import { CodeModal } from './CodeModal';

interface StageDirectorPortalProps {
  project: StudioProject;
  language: 'ar' | 'en';
}

export const StageDirectorPortal: React.FC<StageDirectorPortalProps> = ({
  project,
  language
}) => {
  const isAr = language === 'ar';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeChar =
    project.characters.find((c) => c.id === project.activeCharacterId) || project.characters[0];
  const activeOutfit = project.wardrobe.find((w) => w.id === activeChar?.outfitId);
  const activeBg =
    project.backgrounds.find((b) => b.id === project.activeBackgroundId) || project.backgrounds[0];
  const activePhysPreset =
    project.physicsPresets.find((p) => p.id === project.activePhysicsPresetId) ||
    project.physicsPresets[0];

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [hudStats, setHudStats] = useState({ x: 150, y: 380, speed: 0, itemsCollected: 0 });

  // Player state in stage
  const playerRef = useRef({
    x: 150,
    y: 380,
    vx: 0,
    vy: 0,
    width: 36,
    height: 60,
    speed: 340,
    jumpForce: -480,
    isGrounded: false,
    direction: 1, // 1 for right, -1 for left
    animTime: 0,
    jumpCount: 0,
    itemsCollected: 0
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const bodiesRef = useRef<PhysicsBody[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);
  const timeScaleRef = useRef(1.0);

  // Initialize bodies from active preset
  useEffect(() => {
    bodiesRef.current = JSON.parse(JSON.stringify(activePhysPreset?.bodies || []));
  }, [activePhysPreset]);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focused on an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      keysRef.current[e.code] = true;

      // Jump sound & double jump skill
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        const p = playerRef.current;
        if (p.isGrounded) {
          p.vy = p.jumpForce;
          p.isGrounded = false;
          p.jumpCount = 1;

          // Trigger jump sound preset if available
          const jumpSnd = project.sounds.find((s) => s.category === 'jump') || project.sounds[0];
          if (jumpSnd) audioSynth.play(jumpSnd);
        } else if (p.jumpCount === 1) {
          // Double jump skill check
          const doubleJumpSkill = project.skills.find((s) => s.id === 'skill_double_jump' && s.enabled);
          if (doubleJumpSkill) {
            p.vy = p.jumpForce * 0.9;
            p.jumpCount = 2;
            // Spawn double jump particles
            for (let i = 0; i < 12; i++) {
              particlesRef.current.push({
                x: p.x,
                y: p.y + 10,
                vx: (Math.random() - 0.5) * 160,
                vy: Math.random() * 80 + 20,
                color: '#38bdf8',
                life: 1.0
              });
            }
            const powerSnd = project.sounds.find((s) => s.category === 'powerup');
            if (powerSnd) audioSynth.play(powerSnd);
          }
        }
      }

      // Attack / Laser sound trigger (J)
      if (e.code === 'KeyJ') {
        const laserSnd = project.sounds.find((s) => s.category === 'laser') || project.sounds[1];
        if (laserSnd) audioSynth.play(laserSnd);

        // Spawn energy projectile sparks in direction
        const p = playerRef.current;
        for (let i = 0; i < 8; i++) {
          particlesRef.current.push({
            x: p.x + p.direction * 25,
            y: p.y - 30,
            vx: p.direction * (300 + Math.random() * 200),
            vy: (Math.random() - 0.5) * 80,
            color: activeOutfit?.accentColor || '#38bdf8',
            life: 0.6
          });
        }
      }

      // Explosion trigger (K)
      if (e.code === 'KeyK') {
        const expSnd = project.sounds.find((s) => s.category === 'explosion');
        if (expSnd) audioSynth.play(expSnd);
        // Blast bodies
        const p = playerRef.current;
        bodiesRef.current.forEach((b) => {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 350) {
            b.vx += (dx / dist) * 600;
            b.vy += (dy / dist) * 600;
          }
        });
      }

      // Time Dilate skill (E)
      if (e.code === 'KeyE') {
        const slowSkill = project.skills.find((s) => s.id === 'skill_slow_mo' && s.enabled);
        if (slowSkill) {
          timeScaleRef.current = 0.35;
          setTimeout(() => {
            timeScaleRef.current = 1.0;
          }, 2000);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [project, activeOutfit]);

  // Main Stage Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let bgOffset = 0;
    let stageTime = 0;

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.04) * timeScaleRef.current;
      stageTime += dt;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const p = playerRef.current;
      const keys = keysRef.current;
      const gravity = activePhysPreset?.gravity || 980;

      // 1. Player horizontal movement
      let moving = false;
      if (keys['KeyA'] || keys['ArrowLeft']) {
        p.vx = -p.speed;
        p.direction = -1;
        moving = true;
      } else if (keys['KeyD'] || keys['ArrowRight']) {
        p.vx = p.speed;
        p.direction = 1;
        moving = true;
      } else {
        p.vx = 0;
      }

      // Parallax scrolls with player motion
      bgOffset += p.vx * dt * 0.4 + 0.3;

      // Vertical integration
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Floor clamp
      const floorY = canvas.height - 30;
      if (p.y >= floorY) {
        p.y = floorY;
        p.vy = 0;
        p.isGrounded = true;
        p.jumpCount = 0;
      }

      // Boundary clamp
      if (p.x < 30) p.x = 30;
      if (p.x > canvas.width - 30) p.x = canvas.width - 30;

      if (moving) {
        p.animTime += dt * 8;
      } else {
        p.animTime += dt * 3;
      }

      // 2. Physics bodies simulation
      const bodies = bodiesRef.current;
      bodies.forEach((b) => {
        if (b.isStatic) return;
        b.vy += gravity * dt;
        b.vx *= 1 - (activePhysPreset?.airResistance || 0.001);
        b.vy *= 1 - (activePhysPreset?.airResistance || 0.001);
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        const r = b.radius || 20;
        // Floor
        if (b.y > floorY - r) {
          b.y = floorY - r;
          b.vy = -b.vy * b.restitution;
        }
        // Walls
        if (b.x < r) {
          b.x = r;
          b.vx = -b.vx * b.restitution;
        }
        if (b.x > canvas.width - r) {
          b.x = canvas.width - r;
          b.vx = -b.vx * b.restitution;
        }

        // Check player collision with physics body (coin collection or physical bump)
        const pCenterX = p.x;
        const pCenterY = p.y - 30;
        const distToPlayer = Math.hypot(b.x - pCenterX, b.y - pCenterY);
        if (distToPlayer < r + 25) {
          // Push body
          const nx = (b.x - pCenterX) / distToPlayer;
          const ny = (b.y - pCenterY) / distToPlayer;
          b.vx += nx * 220;
          b.vy += ny * 220;

          // Sound effect trigger on contact
          p.itemsCollected++;
          const coinSnd = project.sounds.find((s) => s.category === 'coin');
          if (coinSnd && Math.random() > 0.6) audioSynth.play(coinSnd);
        }
      });

      // 3. Render Background
      BackgroundRenderer.renderToCanvas(ctx, activeBg, canvas.width, canvas.height, bgOffset, stageTime);

      // 4. Render Physics Bodies
      bodies.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.strokeStyle = '#ffffff66';
        ctx.lineWidth = 2;

        if (b.type === 'circle') {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius || 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Shiny highlight
          ctx.fillStyle = '#ffffff66';
          ctx.beginPath();
          ctx.arc(b.x - (b.radius || 20) * 0.3, b.y - (b.radius || 20) * 0.3, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const w = b.width || 40;
          const h = b.height || 40;
          ctx.beginPath();
          ctx.roundRect(b.x - w / 2, b.y - h / 2, w, h, 6);
          ctx.fill();
          ctx.stroke();
        }
      });

      // 5. Render Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt * 1.5;

        if (pt.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3 * pt.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 6. Render Active Character & Outfit on Stage
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.direction, 1);

      // Character animation offsets
      let legOffset = 0;
      let bodyBob = 0;
      if (moving && p.isGrounded) {
        legOffset = Math.sin(p.animTime * 2) * 16;
        bodyBob = Math.abs(Math.sin(p.animTime * 2)) * 3;
      } else if (!p.isGrounded) {
        bodyBob = -4;
        legOffset = 10;
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cape (behind)
      if (activeOutfit?.cape) {
        ctx.fillStyle = activeOutfit.capeColor || '#dc2626';
        ctx.beginPath();
        ctx.moveTo(-10, -50 - bodyBob);
        ctx.lineTo(-24 - (moving ? 10 : 2), -15);
        ctx.lineTo(0, -18);
        ctx.fill();
      }

      // Legs
      ctx.fillStyle = activeOutfit?.bottomColor || '#1e293b';
      // Left leg
      ctx.fillRect(-10, -22 + legOffset * 0.4, 8, 22);
      // Right leg
      ctx.fillRect(2, -22 - legOffset * 0.4, 8, 22);

      // Shoes
      ctx.fillStyle = activeOutfit?.shoesColor || '#0f172a';
      ctx.fillRect(-12, -4 + legOffset * 0.4, 11, 5);
      ctx.fillRect(0, -4 - legOffset * 0.4, 11, 5);

      // Torso
      ctx.fillStyle = activeOutfit?.topColor || '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(-14, -54 - bodyBob, 28, 34, 6);
      ctx.fill();

      // Torso accent belt
      ctx.fillStyle = activeOutfit?.accentColor || '#f59e0b';
      ctx.fillRect(-14, -26 - bodyBob, 28, 5);

      // Head
      ctx.fillStyle = activeChar.skinTone;
      ctx.beginPath();
      ctx.arc(0, -68 - bodyBob, 15, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = activeChar.eyeColor;
      ctx.beginPath();
      ctx.arc(4, -68 - bodyBob, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = activeChar.hairColor;
      ctx.beginPath();
      ctx.arc(0, -74 - bodyBob, 12, Math.PI, Math.PI * 2);
      ctx.fill();

      // Helmet / Headwear
      if (activeOutfit?.headwear === 'knight_helmet') {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, -72 - bodyBob, 16, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4, -70 - bodyBob, 12, 3);
      } else if (activeOutfit?.headwear === 'cyber_visor') {
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-2, -71 - bodyBob, 14, 5);
      } else if (activeOutfit?.headwear === 'crown') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-8, -86 - bodyBob, 16, 5);
      }

      // Weapon
      if (activeOutfit?.weapon === 'sword') {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(14, -58 - bodyBob, 4, 30);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(10, -32 - bodyBob, 12, 4);
      } else if (activeOutfit?.weapon === 'energy_blade') {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;
        ctx.fillRect(14, -65 - bodyBob, 6, 35);
        ctx.shadowBlur = 0;
      } else if (activeOutfit?.weapon === 'shield') {
        ctx.fillStyle = activeOutfit.accentColor || '#10b981';
        ctx.beginPath();
        ctx.ellipse(14, -40 - bodyBob, 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Update HUD state throttle
      if (Math.random() > 0.8) {
        setHudStats({
          x: Math.round(p.x),
          y: Math.round(p.y),
          speed: Math.round(Math.abs(p.vx)),
          itemsCollected: p.itemsCollected
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeBg, activePhysPreset, activeChar, activeOutfit, project]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Spawn bouncing sphere on click
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
    bodiesRef.current.push({
      id: 'click_' + Date.now(),
      type: 'circle',
      x,
      y,
      vx: (Math.random() - 0.5) * 350,
      vy: -150 - Math.random() * 200,
      radius: 18 + Math.random() * 12,
      mass: 1,
      restitution: 0.85,
      friction: 0.05,
      color: colors[Math.floor(Math.random() * colors.length)]
    });

    const jumpSnd = project.sounds.find((s) => s.category === 'coin') || project.sounds[0];
    if (jumpSnd) audioSynth.play(jumpSnd);
  };

  const handleDownloadSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `omni_stage_${Date.now()}.png`;
    a.click();
  };

  const handleResetStage = () => {
    const p = playerRef.current;
    p.x = 150;
    p.y = 380;
    p.vx = 0;
    p.vy = 0;
    bodiesRef.current = JSON.parse(JSON.stringify(activePhysPreset?.bodies || []));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'المشهد المتكامل واستوديو التجربة الحية' : 'Integrated Stage & Live Game Simulator'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'تجميع كافة الأنظمة في مشهد حي واحد: الشخصية والزي المختار + المؤثرات الصوتية + فيزياء التصادم + الخلفية والطقس'
              : 'Unified live stage combining character rig, chosen outfit, active background parallax, physics collisions, and sound triggers'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetStage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isAr ? 'إعادة ضبط المشهد' : 'Reset Stage'}</span>
          </button>
          <button
            onClick={handleDownloadSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'تحميل صورة المشهد (PNG)' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Game Stage Frame */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
        {/* Top HUD Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeChar.name}</span>
              <span className="text-slate-400 font-normal">({activeChar.role})</span>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <span>الزي: {activeOutfit?.name || 'افتراضي'}</span>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-semibold text-teal-300 flex items-center gap-1.5">
              <span>الخلفية: {activeBg?.name}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-mono text-purple-300">
            X:{hudStats.x} Y:{hudStats.y} | تصادمات:{hudStats.itemsCollected}
          </div>
        </div>

        {/* Canvas Display */}
        <canvas
          ref={canvasRef}
          width={920}
          height={520}
          onClick={handleCanvasClick}
          className="w-full h-[520px] block cursor-crosshair"
        />

        {/* Bottom Interactive Controls Guide */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-white">{isAr ? 'أزرار التحكم:' : 'Controls:'}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">A</kbd>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">D</kbd>
              <span>{isAr ? 'للحركة أفقياً' : 'Move'}</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-indigo-300">Space</kbd>
              <span>{isAr ? 'قفز / قفزة مزدوجة' : 'Jump / Double Jump'}</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-pink-300">J</kbd>
              <span>{isAr ? 'إطلاق شعاع الليزر ومؤثر الصوت' : 'Laser SFX'}</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-amber-300">K</kbd>
              <span>{isAr ? 'انفجار ودفع الأجسام' : 'Explosion Blast'}</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-violet-300">E</kbd>
              <span>{isAr ? 'تمدد الزمن (Slow-Mo)' : 'Time Slow'}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            {isAr ? '💡 اضغط بالفأرة في أي مكان لإسقاط كرات فيزيائية متفاعلة' : '💡 Click anywhere to spawn physics objects'}
          </div>
        </div>
      </div>
    </div>
  );
};
