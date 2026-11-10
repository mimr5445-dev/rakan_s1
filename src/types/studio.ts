export type PortalType = 'stage' | 'audio' | 'physics' | 'characters' | 'wardrobe' | 'backgrounds' | 'skills' | 'drive';

export interface SoundPreset { id: string; name: string; category: 'jump' | 'laser' | 'explosion' | 'coin' | 'powerup' | 'hit' | 'ambient' | 'ui'; type: OscillatorType; startFreq: number; endFreq: number; duration: number; attack: number; decay: number; sustain: number; release: number; pitchJump: number; distortion: number; noise: number; volume: number; customCode?: string; createdAt: number; }
export interface PhysicsBody { id: string; type: 'circle' | 'box' | 'ragdoll' | 'platform'; x: number; y: number; vx: number; vy: number; width?: number; height?: number; radius?: number; mass: number; restitution: number; friction: number; color: string; isStatic?: boolean; }
export interface PhysicsPreset { id: string; name: string; description: string; gravity: number; airResistance: number; wind: number; bodies: PhysicsBody[]; customScript?: string; }

export type CharacterRendererType = 'procedural' | 'svg-layers' | 'sprite-parts' | 'rigged' | 'spritesheet';
export interface CharacterAsset { id: string; name: string; mimeType: string; data: string; width?: number; height?: number; checksum?: string; version?: number; }
export interface CharacterLayer { id: string; name: string; assetId: string; visible: boolean; order: number; x: number; y: number; width?: number; height?: number; rotation?: number; opacity?: number; anchor?: { x: number; y: number }; part?: string; sprite?: { columns: number; rows: number; frameRate: number; frameCount: number; loop: boolean }; }
export interface CharacterBone { id: string; name: string; parentId?: string; x: number; y: number; length: number; rotation: number; }
export interface CharacterKeyframe { time: number; boneId: string; x?: number; y?: number; rotation?: number; }
export interface CharacterAnimationClip { id: string; name: string; duration: number; loop: boolean; keyframes: CharacterKeyframe[]; }
export interface CharacterSchemaData {
  schemaVersion: number;
  renderer: CharacterRendererType;
  metadata: { description?: string; tags?: string[]; category?: string; createdAt?: string; updatedAt?: string; author?: string; source?: string; assetVersion?: number; [key: string]: unknown };
  assets: CharacterAsset[];
  layers: CharacterLayer[];
  skeleton: { bones: CharacterBone[]; ikChains?: Array<{ id: string; rootBoneId: string; endBoneId: string; target: { x: number; y: number } }> };
  animations: CharacterAnimationClip[];
  expressions: Record<string, Record<string, unknown>>;
  wardrobeIds: string[];
  materials: Record<string, { color?: string; textureAssetId?: string; [key: string]: unknown }>;
  audio: { voiceAssetIds: string[]; lipSync?: { enabled: boolean; phonemeMap?: Record<string, string> } };
  variants: Array<{ id: string; name: string; overrides: Record<string, unknown> }>;
  extensions: Record<string, unknown>;
}
export interface CharacterDesign {
  id: string; name: string; skinTone: string; hairStyle: 'short' | 'spiky' | 'long' | 'curly' | 'cyberpunk' | 'none'; hairColor: string; eyeColor: string;
  expression: 'neutral' | 'happy' | 'fierce' | 'surprised' | 'focused'; outfitId: string; scale: number; animation: string; role: string; customCode?: string;
  schema?: CharacterSchemaData;
}
export interface WardrobeItem { id: string; name: string; category: 'armor' | 'casual' | 'cyberpunk' | 'fantasy' | 'wizard'; topColor: string; bottomColor: string; accentColor: string; headwear: 'none' | 'knight_helmet' | 'wizard_hat' | 'cyber_visor' | 'crown' | 'hood'; cape: boolean; capeColor: string; weapon: 'none' | 'sword' | 'energy_blade' | 'magic_staff' | 'shield'; shoesColor: string; customCode?: string; }
export interface BackgroundLayer { id: string; name: string; type: 'sky' | 'mountains' | 'city' | 'trees' | 'stars' | 'ground'; colorA: string; colorB: string; speedMultiplier: number; detailCount: number; heightRatio: number; }
export interface BackgroundPreset { id: string; name: string; theme: 'cyberpunk' | 'fantasy_forest' | 'retro_synthwave' | 'space_void' | 'desert_ruins'; timeOfDay: 'day' | 'sunset' | 'night' | 'eclipse'; weather: 'clear' | 'rain' | 'snow' | 'sparks' | 'fog'; weatherIntensity: number; layers: BackgroundLayer[]; customShaderCode?: string; }
export interface StudioSkill { id: string; name: string; triggerKey: string; description: string; enabled: boolean; code: string; category: 'motion' | 'combat' | 'fx' | 'utility'; cooldownMs: number; }
export interface StudioProject { version: string; name: string; description: string; activeCharacterId: string; activeOutfitId: string; activeBackgroundId: string; activePhysicsPresetId: string; sounds: SoundPreset[]; physicsPresets: PhysicsPreset[]; characters: CharacterDesign[]; wardrobe: WardrobeItem[]; backgrounds: BackgroundPreset[]; skills: StudioSkill[]; settings: { language: 'ar' | 'en'; theme: 'dark'; volume: number; }; }
