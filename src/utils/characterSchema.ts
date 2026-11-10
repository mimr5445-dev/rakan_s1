import type { CharacterDesign, CharacterSchemaData } from '../types/studio';

export const CHARACTER_SCHEMA_VERSION = 1;
const ID_PATTERN = /^[\w.-]{1,128}$/;
const defaultCharacter = (id: string, name: string): CharacterDesign => ({ id, name, skinTone: '#f6d8ae', hairStyle: 'short', hairColor: '#475569', eyeColor: '#3b82f6', expression: 'neutral', outfitId: '', scale: 1, animation: 'idle', role: 'Character' });

export class CharacterValidationError extends Error {
  constructor(public readonly issues: string[]) { super(issues.join('; ')); this.name = 'CharacterValidationError'; }
}

export function createCharacterSchema(overrides: Partial<CharacterSchemaData> = {}): CharacterSchemaData {
  return {
    schemaVersion: CHARACTER_SCHEMA_VERSION, renderer: 'procedural', metadata: {}, assets: [], layers: [],
    skeleton: { bones: [] }, animations: [], expressions: {}, wardrobeIds: [], materials: {},
    audio: { voiceAssetIds: [] }, variants: [], extensions: {}, ...overrides,
  };
}

function isRecord(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function validateCharacter(value: unknown): CharacterDesign {
  if (!isRecord(value)) throw new CharacterValidationError(['Character must be an object']);
  const issues: string[] = [];
  if (typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) issues.push('Invalid or missing character id');
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200) issues.push('Character name is required and must be under 200 characters');
  if (value.schema !== undefined) {
    const schema = value.schema;
    if (!isRecord(schema) || !Number.isInteger(schema.schemaVersion) || schema.schemaVersion < 1 || schema.schemaVersion > CHARACTER_SCHEMA_VERSION) issues.push('Unsupported character schema version');
    if (!['procedural', 'svg-layers', 'sprite-parts', 'rigged', 'spritesheet'].includes(schema?.renderer)) issues.push('Unsupported character renderer');
    if (schema && !Array.isArray(schema.assets)) issues.push('schema.assets must be an array');
    if (schema && !Array.isArray(schema.layers)) issues.push('schema.layers must be an array');
    if (schema && !Array.isArray(schema.animations)) issues.push('schema.animations must be an array');
    if (schema && (!schema.skeleton || !Array.isArray(schema.skeleton.bones))) issues.push('schema.skeleton.bones must be an array');
    if (schema && schema.assets && schema.layers) {
      const assetIds = new Set(schema.assets.map((a: any) => a?.id));
      const uniqueAssetIds = new Set<string>();
      for (const asset of schema.assets) {
        if (!asset || typeof asset.id !== 'string' || !ID_PATTERN.test(asset.id) || typeof asset.data !== 'string' || typeof asset.mimeType !== 'string') { issues.push('Invalid asset record'); continue; }
        if (uniqueAssetIds.has(asset.id)) issues.push(`Duplicate asset id ${asset.id}`); uniqueAssetIds.add(asset.id);
        if (!['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'audio/mpeg', 'audio/wav', 'audio/ogg'].includes(asset.mimeType)) issues.push(`Unsupported asset MIME ${asset.mimeType}`);
        if (!asset.data.startsWith(`data:${asset.mimeType};base64,`)) issues.push(`Asset ${asset.id} data URL does not match its MIME type`);
        if (asset.data.length > 35_000_000) issues.push(`Asset ${asset.id} exceeds the maximum embedded size`);
        if (['width', 'height'].some(key => asset[key] !== undefined && (!Number.isFinite(asset[key]) || asset[key] < 0 || asset[key] > 100_000))) issues.push(`Asset ${asset.id} has invalid dimensions`);
      }
      const layerIds = new Set<string>();
      for (const layer of schema.layers) {
        if (!layer || !assetIds.has(layer.assetId)) { issues.push(`Layer ${layer?.id ?? '(unknown)'} references a missing asset`); continue; }
        if (typeof layer.id !== 'string' || !ID_PATTERN.test(layer.id) || layerIds.has(layer.id)) issues.push('Invalid or duplicate layer id'); else layerIds.add(layer.id);
        const coordinates = [layer.x, layer.y, layer.width ?? 300, layer.height ?? 400, layer.rotation ?? 0, layer.opacity ?? 1, layer.order];
        if (!coordinates.every(Number.isFinite) || coordinates.some((n: number) => Math.abs(n) > 1_000_000) || layer.width < 0 || layer.height < 0 || layer.opacity < 0 || layer.opacity > 1) issues.push(`Layer ${layer.id} has invalid geometry or opacity`);
        if (layer.anchor && (![layer.anchor.x, layer.anchor.y].every(Number.isFinite) || Math.abs(layer.anchor.x) > 10 || Math.abs(layer.anchor.y) > 10)) issues.push(`Layer ${layer.id} has invalid anchor`);
        if (layer.sprite && (![layer.sprite.columns, layer.sprite.rows, layer.sprite.frameRate, layer.sprite.frameCount].every(Number.isFinite) || layer.sprite.columns < 1 || layer.sprite.rows < 1 || layer.sprite.frameCount < 1 || layer.sprite.frameRate < 0)) issues.push(`Layer ${layer.id} has invalid sprite-sheet settings`);
      }
    }
    if (schema?.skeleton?.bones) {
      const boneIds = new Set<string>();
      for (const bone of schema.skeleton.bones) {
        if (!bone || typeof bone.id !== 'string' || !ID_PATTERN.test(bone.id) || boneIds.has(bone.id)) issues.push('Invalid or duplicate skeleton bone id'); else boneIds.add(bone.id);
        if (bone && ![bone.x, bone.y, bone.length, bone.rotation].every(value => Number.isFinite(value) && Math.abs(value) <= 1_000_000)) issues.push(`Bone ${bone.id} has invalid transform`);
      }
      for (const bone of schema.skeleton.bones) if (bone.parentId && !schema.skeleton.bones.some((parent: any) => parent.id === bone.parentId)) issues.push(`Missing parent bone ${bone.parentId}`);
      for (const bone of schema.skeleton.bones) { const visited = new Set<string>(); let current: any = bone; while (current?.parentId) { if (visited.has(current.id)) { issues.push(`Skeleton hierarchy contains a cycle at ${current.id}`); break; } visited.add(current.id); current = schema.skeleton.bones.find((candidate: any) => candidate.id === current.parentId); } }
      for (const chain of schema.skeleton.ikChains ?? []) if (!boneIds.has(chain.rootBoneId) || !boneIds.has(chain.endBoneId) || ![chain.target?.x, chain.target?.y].every(value => Number.isFinite(value) && Math.abs(value) < 1_000_000)) issues.push(`Invalid IK chain ${chain.id}`);
    }
    if (Array.isArray(schema?.animations)) for (const clip of schema.animations) {
      if (!clip || typeof clip.id !== 'string' || typeof clip.name !== 'string' || !Number.isFinite(clip.duration) || clip.duration <= 0 || !Array.isArray(clip.keyframes)) { issues.push('Invalid animation clip'); continue; }
      for (const frame of clip.keyframes) if (!Number.isFinite(frame.time) || frame.time < 0 || frame.time > clip.duration || !schema.skeleton.bones.some((bone: any) => bone.id === frame.boneId) || [frame.x, frame.y, frame.rotation].some((n: unknown) => n !== undefined && !Number.isFinite(n))) issues.push(`Animation ${clip.id} has an invalid keyframe`);
    }
  }
  if (issues.length) throw new CharacterValidationError(issues);
  const legacyDefaults = defaultCharacter(value.id, value.name);
  return { ...legacyDefaults, ...value, id: value.id.trim(), name: value.name.trim(), schema: value.schema ? { ...createCharacterSchema(), ...value.schema } : createCharacterSchema() } as CharacterDesign;
}

/** Converts flat legacy projects and older schema revisions without dropping unknown fields. */
export function migrateCharacter(input: unknown): CharacterDesign {
  if (!isRecord(input)) throw new CharacterValidationError(['Character must be an object']);
  const raw = { ...input };
  const version = Number(raw.schema?.schemaVersion ?? raw.schemaVersion ?? 0);
  if (version > CHARACTER_SCHEMA_VERSION) throw new CharacterValidationError([`Character schema ${version} is newer than supported schema ${CHARACTER_SCHEMA_VERSION}`]);
  if (version === 0) {
    const previous = isRecord(raw.schema) ? raw.schema : {};
    const legacyLayers = Array.isArray(previous.layers) ? previous.layers : (Array.isArray(raw.layers) ? raw.layers : []);
    raw.schema = createCharacterSchema({
      renderer: previous.renderer ?? (legacyLayers.length ? 'svg-layers' : 'procedural'),
      metadata: { ...(isRecord(raw.metadata) ? raw.metadata : {}), ...(isRecord(previous.metadata) ? previous.metadata : {}), migratedFrom: 'legacy-flat-character' },
      assets: Array.isArray(previous.assets) ? previous.assets : (Array.isArray(raw.assets) ? raw.assets : []), layers: legacyLayers,
      skeleton: (isRecord(previous.skeleton) ? previous.skeleton : isRecord(raw.skeleton) ? raw.skeleton : { bones: [] }) as CharacterSchemaData['skeleton'],
      animations: Array.isArray(previous.animations) ? previous.animations : (Array.isArray(raw.animations) ? raw.animations : []),
      expressions: isRecord(previous.expressions) ? previous.expressions : (isRecord(raw.expressions) ? raw.expressions : {}),
      wardrobeIds: Array.isArray(previous.wardrobeIds) ? previous.wardrobeIds : (Array.isArray(raw.wardrobeIds) ? raw.wardrobeIds : raw.outfitId ? [raw.outfitId] : []),
      materials: isRecord(previous.materials) ? previous.materials : (isRecord(raw.materials) ? raw.materials : {}),
      audio: (isRecord(previous.audio) ? previous.audio : isRecord(raw.audio) ? raw.audio : { voiceAssetIds: [] }) as CharacterSchemaData['audio'],
      variants: Array.isArray(previous.variants) ? previous.variants : (Array.isArray(raw.variants) ? raw.variants : []),
      extensions: { ...(isRecord(raw.extensions) ? raw.extensions : {}), ...(isRecord(previous.extensions) ? previous.extensions : {}) },
    });
  } else {
    const schema = raw.schema as Record<string, any>;
    raw.schema = {
      ...createCharacterSchema(), ...schema,
      metadata: isRecord(schema.metadata) ? schema.metadata : {},
      assets: Array.isArray(schema.assets) ? schema.assets : [], layers: Array.isArray(schema.layers) ? schema.layers : [],
      skeleton: { bones: [], ...(isRecord(schema.skeleton) ? schema.skeleton : {}) } as CharacterSchemaData['skeleton'],
      animations: Array.isArray(schema.animations) ? schema.animations : [], expressions: isRecord(schema.expressions) ? schema.expressions : {},
      wardrobeIds: Array.isArray(schema.wardrobeIds) ? schema.wardrobeIds : [], materials: isRecord(schema.materials) ? schema.materials : {},
      audio: { voiceAssetIds: [], ...(isRecord(schema.audio) ? schema.audio : {}) } as CharacterSchemaData['audio'],
      variants: Array.isArray(schema.variants) ? schema.variants : [], extensions: isRecord(schema.extensions) ? schema.extensions : {},
    };
  }
  return validateCharacter(raw);
}

export function exportCharacterDocument(character: CharacterDesign): { format: 'omnistudio-character'; schemaVersion: number; character: CharacterDesign } {
  const canonical = migrateCharacter(character);
  return { format: 'omnistudio-character', schemaVersion: CHARACTER_SCHEMA_VERSION, character: canonical };
}
