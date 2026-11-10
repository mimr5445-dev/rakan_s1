import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsEngine } from './physicsEngine';
import { PhysicsPreset } from '../types/studio';

const mockPreset: PhysicsPreset = {
  id: 'earth_gravity',
  name: 'Earth Gravity',
  description: 'Standard gravity with bouncing spheres',
  gravity: 980,
  airResistance: 0.001,
  wind: 0,
  bodies: [
    {
      id: 'ball1',
      type: 'circle',
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 20,
      mass: 1,
      restitution: 0.8,
      friction: 0.05,
      color: '#6366f1'
    }
  ]
};

test('PhysicsEngine updates body position with gravity and collision with ground', () => {
  const engine = new PhysicsEngine(mockPreset, 800, 500);
  assert.equal(engine.bodies.length, 1);
  assert.equal(engine.bodies[0].y, 100);

  // Step 0.1s
  engine.step(0.1);
  assert.ok(engine.bodies[0].vy > 0, 'Velocity downwards must increase with positive gravity');
  assert.ok(engine.bodies[0].y > 100, 'Position must move downwards');

  // Fast forward until it bounces off ground (ground is height - radius = 500 - 20 = 480)
  for (let i = 0; i < 40; i++) {
    engine.step(0.05);
  }

  // Body should be clamped within bounds
  assert.ok(engine.bodies[0].y <= 480, 'Body should not penetrate floor');
});

test('PhysicsEngine generates executable HTML canvas code', () => {
  const code = PhysicsEngine.generateCode(mockPreset);
  assert.ok(code.includes('<canvas'));
  assert.ok(code.includes('GRAVITY = 980'));
  assert.ok(code.includes('requestAnimationFrame'));
});
