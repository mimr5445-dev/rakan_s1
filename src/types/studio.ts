export type PortalType = 
  | 'stage'
  | 'audio'
  | 'physics'
  | 'characters'
  | 'wardrobe'
  | 'backgrounds'
  | 'skills';

// Sound Effect
export interface SoundPreset {
  id: string;
  name: string;
  category: 'jump' | 'laser' | 'explosion' | 'coin' | 'powerup' | 'hit' | 'ambient' | 'ui';
  type: OscillatorType; // 'sine' | 'square' | 'sawtooth' | 'triangle'
  startFreq: number;
  endFreq: number;
  duration: number; // in seconds
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  pitchJump: number; // pitch jump in semitones
  distortion: number; // 0 to 1
  noise: number; // 0 to 1
  volume: number; // 0 to 1
  customCode?: string;
  createdAt: number;
}

// Physics Config & Preset
export interface PhysicsBody {
  id: string;
  type: 'circle' | 'box' | 'ragdoll' | 'platform';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width?: number;
  height?: number;
  radius?: number;
  mass: number;
  restitution: number; // bounce 0 to 1
  friction: number;
  color: string;
  isStatic?: boolean;
}

export interface PhysicsPreset {
  id: string;
  name: string;
  description: string;
  gravity: number;
  airResistance: number;
  wind: number;
  bodies: PhysicsBody[];
  customScript?: string;
}

// Character Design
export interface CharacterDesign {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: 'short' | 'spiky' | 'long' | 'curly' | 'cyberpunk' | 'none';
  hairColor: string;
  eyeColor: string;
  expression: 'neutral' | 'happy' | 'fierce' | 'surprised' | 'focused';
  outfitId: string;
  scale: number;
  animation: 'idle' | 'walk' | 'jump' | 'attack' | 'dance';
  role: string;
  customCode?: string;
}

// Wardrobe / Costume
export interface WardrobeItem {
  id: string;
  name: string;
  category: 'armor' | 'casual' | 'cyberpunk' | 'fantasy' | 'wizard';
  topColor: string;
  bottomColor: string;
  accentColor: string;
  headwear: 'none' | 'knight_helmet' | 'wizard_hat' | 'cyber_visor' | 'crown' | 'hood';
  cape: boolean;
  capeColor: string;
  weapon: 'none' | 'sword' | 'energy_blade' | 'magic_staff' | 'shield';
  shoesColor: string;
  customCode?: string;
}

// Background
export interface BackgroundLayer {
  id: string;
  name: string;
  type: 'sky' | 'mountains' | 'city' | 'trees' | 'stars' | 'ground';
  colorA: string;
  colorB: string;
  speedMultiplier: number;
  detailCount: number;
  heightRatio: number;
}

export interface BackgroundPreset {
  id: string;
  name: string;
  theme: 'cyberpunk' | 'fantasy_forest' | 'retro_synthwave' | 'space_void' | 'desert_ruins';
  timeOfDay: 'day' | 'sunset' | 'night' | 'eclipse';
  weather: 'clear' | 'rain' | 'snow' | 'sparks' | 'fog';
  weatherIntensity: number;
  layers: BackgroundLayer[];
  customShaderCode?: string;
}

// Skill / Behavior Plugin
export interface StudioSkill {
  id: string;
  name: string;
  triggerKey: string;
  description: string;
  enabled: boolean;
  code: string;
  category: 'motion' | 'combat' | 'fx' | 'utility';
  cooldownMs: number;
}

// Full Studio Project State
export interface StudioProject {
  version: string;
  name: string;
  description: string;
  activeCharacterId: string;
  activeOutfitId: string;
  activeBackgroundId: string;
  activePhysicsPresetId: string;
  sounds: SoundPreset[];
  physicsPresets: PhysicsPreset[];
  characters: CharacterDesign[];
  wardrobe: WardrobeItem[];
  backgrounds: BackgroundPreset[];
  skills: StudioSkill[];
  settings: {
    language: 'ar' | 'en';
    theme: 'dark';
    volume: number;
  };
}
