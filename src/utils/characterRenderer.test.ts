import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterRenderer } from './characterRenderer';
import { CharacterDesign, WardrobeItem } from '../types/studio';

const mockCharacter: CharacterDesign = {
  id: 'hero_1',
  name: 'Cyber Knight',
  skinTone: '#f6d8ae',
  hairStyle: 'spiky',
  hairColor: '#3b82f6',
  eyeColor: '#06b6d4',
  expression: 'fierce',
  outfitId: 'armor_1',
  scale: 1,
  animation: 'idle',
  role: 'Warrior'
};

const mockOutfit: WardrobeItem = {
  id: 'armor_1',
  name: 'Paladin Plate',
  category: 'armor',
  topColor: '#3b82f6',
  bottomColor: '#1e293b',
  accentColor: '#f59e0b',
  headwear: 'knight_helmet',
  cape: true,
  capeColor: '#ef4444',
  weapon: 'sword',
  shoesColor: '#0f172a'
};

test('CharacterRenderer generates valid SVG with helmet, cape, and sword', () => {
  const svg = CharacterRenderer.generateSvg(mockCharacter, mockOutfit, 0);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('</svg>'));
  // Should include cape
  assert.ok(svg.includes('#ef4444'));
  // Should include helmet path
  assert.ok(svg.includes('#94a3b8'));
});

test('CharacterRenderer produces standalone exportable code', () => {
  const code = CharacterRenderer.generateCode(mockCharacter, mockOutfit);
  assert.ok(code.includes('characterSvg'));
  assert.ok(code.includes('Cyber Knight'));
  assert.ok(code.includes('Paladin Plate'));
});
