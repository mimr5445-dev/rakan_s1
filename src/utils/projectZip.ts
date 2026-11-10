import JSZip from 'jszip';
import { StudioProject } from '../types/studio';
import { AudioSynthesizer } from './audioSynth';
import { CharacterRenderer } from './characterRenderer';
import { PhysicsEngine } from './physicsEngine';
import { BackgroundRenderer } from './backgroundRenderer';

export async function exportStudioProjectZip(project: StudioProject): Promise<Blob> {
  const zip = new JSZip();

  // 1. Project metadata and raw JSON
  zip.file('project.json', JSON.stringify(project, null, 2));

  // 2. Comprehensive README
  const readme = `# OmniStudio Project: ${project.name}
${project.description}

## المحتويات والمكونات (Contents):
- 🎵 **المؤثرات الصوتية (Sounds)**: ${project.sounds.length} مؤثرات
- ⚡ **المحاكاة الفيزيائية (Physics)**: ${project.physicsPresets.length} مشهد فيزيائي
- 👤 **الشخصيات (Characters)**: ${project.characters.length} شخصية
- 🛡️ **خزانة الملابس (Wardrobe)**: ${project.wardrobe.length} أزياء ومعدات
- 🌄 **الخلفيات التفاعلية (Backgrounds)**: ${project.backgrounds.length} خلفيات بارالاكس
- ✨ **المهارات والملحقات (Skills)**: ${project.skills.length} مهارات برمجية

## التشغيل الفوري (Quick Start):
افتح ملف \`index.html\` في أي متصفح ويب بدون الحاجة لأي خادم لتجربة اللعبة والمشهد التفاعلي المكتمل!
`;
  zip.file('README.md', readme);

  // 3. Audio folder
  const audioFolder = zip.folder('audio');
  if (audioFolder) {
    project.sounds.forEach((snd) => {
      const code = AudioSynthesizer.generateCode(snd);
      audioFolder.file(`${snd.id}_${snd.name.replace(/[^a-zA-Z0-9]/g, '_')}.js`, code);
      // WAV buffer
      try {
        const wavBuffer = AudioSynthesizer.generateWavBuffer(snd);
        audioFolder.file(`${snd.id}.wav`, wavBuffer);
      } catch (e) {
        console.warn('WAV export error:', e);
      }
    });
  }

  // 4. Physics folder
  const physFolder = zip.folder('physics');
  if (physFolder) {
    project.physicsPresets.forEach((p) => {
      const code = PhysicsEngine.generateCode(p);
      physFolder.file(`${p.id}_simulation.html`, code);
      physFolder.file(`${p.id}.json`, JSON.stringify(p, null, 2));
    });
  }

  // 5. Characters folder
  const charFolder = zip.folder('characters');
  if (charFolder) {
    project.characters.forEach((char) => {
      const matchingOutfit = project.wardrobe.find((w) => w.id === char.outfitId);
      const svg = CharacterRenderer.generateSvg(char, matchingOutfit, 0);
      const code = CharacterRenderer.generateCode(char, matchingOutfit);
      charFolder.file(`${char.id}.svg`, svg);
      charFolder.file(`${char.id}.js`, code);
    });
  }

  // 6. Wardrobe folder
  const wardFolder = zip.folder('wardrobe');
  if (wardFolder) {
    project.wardrobe.forEach((outfit) => {
      wardFolder.file(`${outfit.id}.json`, JSON.stringify(outfit, null, 2));
    });
  }

  // 7. Backgrounds folder
  const bgFolder = zip.folder('backgrounds');
  if (bgFolder) {
    project.backgrounds.forEach((bg) => {
      const code = BackgroundRenderer.generateCode(bg);
      bgFolder.file(`${bg.id}_scene.html`, code);
    });
  }

  // 8. Skills folder
  const skillsFolder = zip.folder('skills');
  if (skillsFolder) {
    project.skills.forEach((sk) => {
      skillsFolder.file(`${sk.id}.js`, `// Skill: ${sk.name} (Trigger: ${sk.triggerKey})\n${sk.code}`);
    });
  }

  // 9. Standalone runnable interactive index.html
  const activeChar = project.characters.find((c) => c.id === project.activeCharacterId) || project.characters[0];
  const activeOutfit = project.wardrobe.find((w) => w.id === (activeChar?.outfitId || project.activeOutfitId));
  const activeBg = project.backgrounds.find((b) => b.id === project.activeBackgroundId) || project.backgrounds[0];
  const activePhys = project.physicsPresets.find((p) => p.id === project.activePhysicsPresetId) || project.physicsPresets[0];

  const standaloneHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${project.name} - Standalone Game & Engine</title>
  <style>
    body {
      margin: 0;
      background: #020617;
      color: #fff;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    #gameContainer {
      position: relative;
      width: 900px;
      height: 520px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.8);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .hud {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
    }
    .badge {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .controls {
      margin-top: 14px;
      font-size: 13px;
      color: #94a3b8;
      display: flex;
      gap: 16px;
    }
    kbd {
      background: #1e293b;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #475569;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div id="gameContainer">
    <div class="hud">
      <div class="badge">OmniStudio Standalone Game</div>
      <div class="badge">اللاعب: ${activeChar?.name || 'البطل'}</div>
    </div>
    <canvas id="gameCanvas" width="900" height="520"></canvas>
  </div>
  <div class="controls">
    <span>تحكم اللاعب: <kbd>A / D</kbd> أو <kbd>◀ / ▶</kbd> للحركة</span>
    <span>قفز: <kbd>Space</kbd> أو <kbd>W</kbd></span>
    <span>إطلاق صوت/مؤثر: <kbd>J</kbd></span>
    <span>إضافة أجسام فيزيائية: اضغط بالفأرة على الشاشة</span>
  </div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const player = {
      x: 150,
      y: 350,
      vx: 0,
      vy: 0,
      width: 40,
      height: 65,
      speed: 320,
      jumpForce: -480,
      isGrounded: false,
      direction: 1,
      animTime: 0
    };

    const keys = {};
    window.addEventListener('keydown', e => { keys[e.code] = true; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    let bodies = ${JSON.stringify(activePhys?.bodies || [], null, 2)};
    const gravity = ${activePhys?.gravity || 980};

    function update(dt) {
      // Player movement
      let moving = false;
      if (keys['KeyA'] || keys['ArrowLeft']) {
        player.vx = -player.speed;
        player.direction = -1;
        moving = true;
      } else if (keys['KeyD'] || keys['ArrowRight']) {
        player.vx = player.speed;
        player.direction = 1;
        moving = true;
      } else {
        player.vx = 0;
      }

      if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && player.isGrounded) {
        player.vy = player.jumpForce;
        player.isGrounded = false;
      }

      player.vy += gravity * dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Floor check
      const floorY = canvas.height - 30;
      if (player.y >= floorY) {
        player.y = floorY;
        player.vy = 0;
        player.isGrounded = true;
      }

      // Walls
      if (player.x < 30) player.x = 30;
      if (player.x > canvas.width - 30) player.x = canvas.width - 30;

      if (moving) {
        player.animTime += dt * 8;
      } else {
        player.animTime += dt * 3;
      }

      // Physics bodies update
      bodies.forEach(b => {
        if (b.isStatic) return;
        b.vy += gravity * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        const r = b.radius || 20;
        if (b.y > floorY - r) {
          b.y = floorY - r;
          b.vy = -b.vy * 0.75;
        }
        if (b.x < r) { b.x = r; b.vx = -b.vx * 0.75; }
        if (b.x > canvas.width - r) { b.x = canvas.width - r; b.vx = -b.vx * 0.75; }
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Sky
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, '#05051a');
      sky.addColorStop(1, '#2c0c3e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // City buildings
      ctx.fillStyle = '#110b20';
      for (let i = 0; i < 15; i++) {
        ctx.fillRect(i * 70, canvas.height - 180 - ((i * 43) % 100), 55, 200);
      }

      // Ground
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, canvas.height - 30, canvas.width, 30);

      // Physics bodies
      bodies.forEach(b => {
        ctx.fillStyle = b.color || '#ec4899';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius || 20, 0, Math.PI * 2);
        ctx.fill();
      });

      // Player
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(player.direction, 1);

      // Simple character silhouette
      ctx.fillStyle = '${activeOutfit?.topColor || '#4f46e5'}';
      ctx.fillRect(-15, -55, 30, 35);
      ctx.fillStyle = '${activeChar?.skinTone || '#f6d8ae'}';
      ctx.beginPath();
      ctx.arc(0, -68, 16, 0, Math.PI * 2);
      ctx.fill();

      // Cape
      ${activeOutfit?.cape ? `ctx.fillStyle = '${activeOutfit.capeColor}'; ctx.fillRect(-22, -50, 10, 32);` : ''}

      // Weapon
      ${activeOutfit?.weapon === 'energy_blade' ? `ctx.fillStyle = '#38bdf8'; ctx.fillRect(16, -60, 6, 40);` : ''}

      ctx.restore();
    }

    let last = performance.now();
    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      bodies.push({
        id: 'click_' + Date.now(),
        type: 'circle',
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: -200,
        radius: 20,
        mass: 1,
        restitution: 0.8,
        color: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'][Math.floor(Math.random() * 5)]
      });
    });
  </script>
</body>
</html>`;

  zip.file('index.html', standaloneHtml);

  return await zip.generateAsync({ type: 'blob' });
}
