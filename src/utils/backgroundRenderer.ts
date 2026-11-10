import { BackgroundPreset } from '../types/studio';

export class BackgroundRenderer {
  public static renderToCanvas(
    ctx: CanvasRenderingContext2D,
    preset: BackgroundPreset,
    width: number,
    height: number,
    scrollOffset = 0,
    time = 0
  ): void {
    ctx.clearRect(0, 0, width, height);

    // 1. Sky & Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (preset.theme === 'cyberpunk') {
      skyGrad.addColorStop(0, '#05051a');
      skyGrad.addColorStop(0.6, '#180e29');
      skyGrad.addColorStop(1, '#2c0c3e');
    } else if (preset.theme === 'fantasy_forest') {
      skyGrad.addColorStop(0, '#021b1a');
      skyGrad.addColorStop(0.6, '#064e3b');
      skyGrad.addColorStop(1, '#042f2e');
    } else if (preset.theme === 'retro_synthwave') {
      skyGrad.addColorStop(0, '#090014');
      skyGrad.addColorStop(0.5, '#2e0854');
      skyGrad.addColorStop(0.7, '#831843');
      skyGrad.addColorStop(1, '#fbbf24');
    } else if (preset.theme === 'space_void') {
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(0.5, '#0b0f29');
      skyGrad.addColorStop(1, '#1e1b4b');
    } else {
      // Desert ruins
      skyGrad.addColorStop(0, '#451a03');
      skyGrad.addColorStop(0.6, '#9a3412');
      skyGrad.addColorStop(1, '#ea580c');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Celestial Object (Sun / Moon / Ringed Planet)
    if (preset.theme === 'retro_synthwave') {
      const sunY = height * 0.45;
      const sunR = 80;
      const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.5, '#f43f5e');
      sunGrad.addColorStop(1, '#831843');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width * 0.5, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Synthwave horizontal cuts in sun
      ctx.fillStyle = '#090014';
      for (let i = 0; i < 6; i++) {
        const sliceY = sunY + 15 + i * 11;
        ctx.fillRect(width * 0.5 - sunR, sliceY, sunR * 2, 3 + i * 0.8);
      }
    } else if (preset.theme === 'space_void' || preset.theme === 'fantasy_forest') {
      // Celestial moon
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.25, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 3. Stars / Far Elements
    if (preset.theme === 'space_void' || preset.timeOfDay === 'night' || preset.theme === 'retro_synthwave') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const x = (i * 73 + scrollOffset * 0.05) % width;
        const y = (i * 47) % (height * 0.6);
        const radius = (i % 3 === 0) ? 1.8 : 1;
        const alpha = 0.3 + 0.7 * Math.sin(time * 3 + i);
        ctx.globalAlpha = Math.max(0.1, alpha);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 4. Parallax Background Layers
    // Layer 1: Distant silhouette (mountains/skyline)
    const p1 = (scrollOffset * 0.2) % 200;
    ctx.fillStyle = preset.theme === 'cyberpunk' ? '#110b20' : preset.theme === 'fantasy_forest' ? '#064e3b' : '#312e81';
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = -200; x <= width + 200; x += 100) {
      const peakY = height * 0.55 - Math.sin((x + p1) * 0.015) * 45;
      ctx.lineTo(x - p1, peakY);
    }
    ctx.lineTo(width, height);
    ctx.fill();

    // Layer 2: Mid-ground structures (buildings or trees or dunes)
    const p2 = (scrollOffset * 0.5) % 120;
    if (preset.theme === 'cyberpunk') {
      ctx.fillStyle = '#090817';
      for (let b = -2; b < width / 50 + 2; b++) {
        const bX = b * 60 - p2;
        const bH = 120 + ((b * 47) % 150);
        const bW = 48;
        ctx.fillRect(bX, height - bH, bW, bH);

        // Neon Windows
        ctx.fillStyle = (b % 2 === 0) ? '#06b6d4' : '#f43f5e';
        for (let wy = height - bH + 15; wy < height - 20; wy += 22) {
          if ((b + wy) % 3 !== 0) {
            ctx.fillRect(bX + 8, wy, 8, 10);
            ctx.fillRect(bX + 28, wy, 8, 10);
          }
        }
        ctx.fillStyle = '#090817';
      }
    } else if (preset.theme === 'fantasy_forest') {
      ctx.fillStyle = '#022c22';
      for (let tx = -50; tx < width + 50; tx += 45) {
        const treeX = tx - p2;
        const treeH = 180 + ((tx * 31) % 60);
        ctx.beginPath();
        ctx.moveTo(treeX, height);
        ctx.lineTo(treeX + 20, height - treeH);
        ctx.lineTo(treeX + 40, height);
        ctx.fill();
      }
    } else if (preset.theme === 'retro_synthwave') {
      // Perspective wireframe grid floor
      const gridHorizon = height * 0.65;
      ctx.fillStyle = '#18042b';
      ctx.fillRect(0, gridHorizon, width, height - gridHorizon);

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;

      // Vertical perspective lines
      for (let i = -10; i <= 20; i++) {
        const xBottom = (width * 0.5) + (i * 90) - (scrollOffset * 1.5) % 90;
        ctx.beginPath();
        ctx.moveTo(width * 0.5, gridHorizon);
        ctx.lineTo(xBottom, height);
        ctx.stroke();
      }
      // Horizontal vanishing lines
      for (let h = 0; h < 9; h++) {
        const prog = Math.pow(h / 8, 2);
        const hy = gridHorizon + (height - gridHorizon) * prog;
        ctx.beginPath();
        ctx.moveTo(0, hy);
        ctx.lineTo(width, hy);
        ctx.stroke();
      }
    } else {
      // Dunes
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let dx = -100; dx <= width + 100; dx += 80) {
        const dy = height * 0.68 - Math.sin((dx + p2) * 0.02) * 35;
        ctx.lineTo(dx - p2, dy);
      }
      ctx.lineTo(width, height);
      ctx.fill();
    }

    // Foreground Ground Baseline
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, height - 30, width, 30);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height - 30);
    ctx.lineTo(width, height - 30);
    ctx.stroke();

    // 5. Dynamic Weather System
    if (preset.weather === 'rain') {
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.65;
      for (let r = 0; r < 90; r++) {
        const rx = (r * 37 + time * 350) % width;
        const ry = (r * 83 + time * 850) % height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 22);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (preset.weather === 'snow') {
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 70; s++) {
        const sx = (s * 41 + Math.sin(time + s) * 30) % width;
        const sy = (s * 67 + time * 80) % height;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(s);
        ctx.beginPath();
        ctx.arc(sx, sy, (s % 3) + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (preset.weather === 'sparks') {
      ctx.fillStyle = '#f59e0b';
      for (let sp = 0; sp < 50; sp++) {
        const spx = (sp * 53 + Math.sin(time * 2 + sp) * 40) % width;
        const spy = height - ((sp * 79 + time * 120) % (height * 0.9));
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(spx, spy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (preset.weather === 'fog') {
      const fogGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
      fogGrad.addColorStop(0, 'rgba(255,255,255,0)');
      fogGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.2)');
      fogGrad.addColorStop(1, 'rgba(148, 163, 184, 0.45)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, height * 0.5, width, height * 0.5);
    }
  }

  // Export standalone HTML/Canvas code for this background
  public static generateCode(preset: BackgroundPreset, width = 800, height = 450): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniStudio Parallax Background - ${preset.name}</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    canvas { border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
  </style>
</head>
<body>
  <canvas id="bgCanvas" width="${width}" height="${height}"></canvas>

  <script>
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    const theme = '${preset.theme}';
    const weather = '${preset.weather}';

    let offset = 0;
    let time = 0;

    function render() {
      time += 0.016;
      offset += 1.5;

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#05051a');
      skyGrad.addColorStop(1, '#2c0c3e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant mountains
      ctx.fillStyle = '#110b20';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width + 100; x += 80) {
        const y = canvas.height * 0.6 - Math.sin((x + offset * 0.3) * 0.02) * 40;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fill();

      // Foreground Ground
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  </script>
</body>
</html>`;
  }
}
