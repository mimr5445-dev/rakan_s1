import { PhysicsBody, PhysicsPreset } from '../types/studio';

export interface PhysicsWorldState {
  gravity: number;
  wind: number;
  airResistance: number;
  width: number;
  height: number;
  bodies: PhysicsBody[];
}

export class PhysicsEngine {
  public gravity: number = 980; // pixels / s^2
  public airResistance: number = 0.001;
  public wind: number = 0;
  public width: number = 800;
  public height: number = 500;
  public bodies: PhysicsBody[] = [];

  constructor(preset?: PhysicsPreset, width = 800, height = 500) {
    this.width = width;
    this.height = height;
    if (preset) {
      this.loadPreset(preset);
    }
  }

  public loadPreset(preset: PhysicsPreset): void {
    this.gravity = preset.gravity;
    this.airResistance = preset.airResistance;
    this.wind = preset.wind;
    // Deep copy bodies
    this.bodies = JSON.parse(JSON.stringify(preset.bodies));
  }

  public addBody(body: PhysicsBody): void {
    this.bodies.push(body);
  }

  public removeBody(id: string): void {
    this.bodies = this.bodies.filter((b) => b.id !== id);
  }

  public clear(): void {
    this.bodies = [];
  }

  // Update step
  public step(dt: number): void {
    // Clamp dt to prevent tunneling
    const timeStep = Math.min(dt, 0.033);

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (b.isStatic) continue;

      // Apply Gravity and Wind
      b.vy += this.gravity * timeStep;
      b.vx += this.wind * timeStep;

      // Air resistance
      const drag = 1 - this.airResistance;
      b.vx *= drag;
      b.vy *= drag;

      // Position integration
      b.x += b.vx * timeStep;
      b.y += b.vy * timeStep;

      // Boundary collision
      const radius = b.radius || (b.width ? b.width / 2 : 20);
      const bottom = this.height - radius;
      const top = radius;
      const left = radius;
      const right = this.width - radius;

      // Ground
      if (b.y > bottom) {
        b.y = bottom;
        b.vy = -b.vy * b.restitution;
        b.vx *= 1 - b.friction;
        if (Math.abs(b.vy) < 10) b.vy = 0;
      }

      // Ceiling
      if (b.y < top) {
        b.y = top;
        b.vy = -b.vy * b.restitution;
      }

      // Walls
      if (b.x < left) {
        b.x = left;
        b.vx = -b.vx * b.restitution;
      } else if (b.x > right) {
        b.x = right;
        b.vx = -b.vx * b.restitution;
      }
    }

    // Inter-body collisions (circle to circle & circle to box)
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        this.resolveCollision(this.bodies[i], this.bodies[j]);
      }
    }
  }

  private resolveCollision(a: PhysicsBody, b: PhysicsBody): void {
    // Circle - Circle
    const rA = a.radius || (a.width ? a.width / 2 : 20);
    const rB = b.radius || (b.width ? b.width / 2 : 20);

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = rA + rB;

    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // Separate bodies
      if (!a.isStatic && !b.isStatic) {
        const totalMass = a.mass + b.mass;
        const ratioA = b.mass / totalMass;
        const ratioB = a.mass / totalMass;
        a.x -= nx * overlap * ratioA;
        a.y -= ny * overlap * ratioA;
        b.x += nx * overlap * ratioB;
        b.y += ny * overlap * ratioB;
      } else if (!a.isStatic) {
        a.x -= nx * overlap;
        a.y -= ny * overlap;
      } else if (!b.isStatic) {
        b.x += nx * overlap;
        b.y += ny * overlap;
      }

      // Velocity reflection along normal
      const kx = a.vx - b.vx;
      const ky = a.vy - b.vy;
      const p = 2 * (nx * kx + ny * ky) / (a.mass + b.mass);

      const restitution = Math.min(a.restitution, b.restitution);

      if (!a.isStatic) {
        a.vx -= p * b.mass * nx * (1 + restitution);
        a.vy -= p * b.mass * ny * (1 + restitution);
      }
      if (!b.isStatic) {
        b.vx += p * a.mass * nx * (1 + restitution);
        b.vy += p * a.mass * ny * (1 + restitution);
      }
    }
  }

  // Generate standalone runnable HTML & JS canvas code
  public static generateCode(preset: PhysicsPreset, width = 800, height = 500): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniStudio Physics - ${preset.name}</title>
  <style>
    body { margin: 0; background: #090d16; display: flex; justify-content: center; align-items: center; min-height: 100vh; color: #fff; font-family: sans-serif; }
    canvas { background: #0f172a; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); cursor: crosshair; }
    .hint { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 8px 16px; border-radius: 8px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="hint">Click or Drag to spawn & interact with physics objects!</div>
  <canvas id="simCanvas" width="${width}" height="${height}"></canvas>

  <script>
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');
    const GRAVITY = ${preset.gravity};
    const WIND = ${preset.wind};
    const AIR_RESISTANCE = ${preset.airResistance};

    let bodies = ${JSON.stringify(preset.bodies, null, 2)};

    let lastTime = performance.now();

    function update(dt) {
      const step = Math.min(dt, 0.033);
      bodies.forEach(b => {
        if (b.isStatic) return;
        b.vy += GRAVITY * step;
        b.vx += WIND * step;
        b.vx *= (1 - AIR_RESISTANCE);
        b.vy *= (1 - AIR_RESISTANCE);

        b.x += b.vx * step;
        b.y += b.vy * step;

        const r = b.radius || (b.width ? b.width / 2 : 20);
        if (b.y > canvas.height - r) {
          b.y = canvas.height - r;
          b.vy = -b.vy * b.restitution;
          b.vx *= (1 - b.friction);
        }
        if (b.x < r) { b.x = r; b.vx = -b.vx * b.restitution; }
        if (b.x > canvas.width - r) { b.x = canvas.width - r; b.vx = -b.vx * b.restitution; }
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      bodies.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 2;

        if (b.type === 'circle') {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius || 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          const w = b.width || 40;
          const h = b.height || 40;
          ctx.beginPath();
          ctx.roundRect(b.x - w / 2, b.y - h / 2, w, h, 6);
          ctx.fill();
          ctx.stroke();
        }
      });
    }

    function loop(time) {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
      bodies.push({
        id: 'obj_' + Date.now(),
        type: Math.random() > 0.4 ? 'circle' : 'box',
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: -150 - Math.random() * 200,
        radius: 18 + Math.random() * 15,
        width: 35,
        height: 35,
        mass: 1,
        restitution: 0.75,
        friction: 0.05,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    });
  </script>
</body>
</html>`;
  }
}
