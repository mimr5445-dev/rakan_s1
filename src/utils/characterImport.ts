import JSZip from 'jszip';
import type { CharacterDesign, CharacterAsset, CharacterLayer } from '../types/studio';
import { createCharacterSchema, migrateCharacter, validateCharacter } from './characterSchema';

export const IMPORT_LIMITS = { fileBytes: 25 * 1024 * 1024, zipEntries: 200, expandedBytes: 80 * 1024 * 1024, textBytes: 2 * 1024 * 1024 } as const;
export type CharacterImportFormat = 'json' | 'javascript' | 'svg' | 'image' | 'zip';
export interface CharacterImportResult { character: CharacterDesign; format: CharacterImportFormat; warnings: string[]; assetsImported: number; }
export class CharacterImportError extends Error { constructor(message: string, public readonly details: string[] = []) { super(message); this.name = 'CharacterImportError'; } }

const safeId = (name: string) => name.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || `character_${Date.now()}`;
const asDataUrl = (mime: string, bytes: Uint8Array) => `data:${mime};base64,${bytesToBase64(bytes)}`;
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  if (typeof btoa !== 'function') throw new CharacterImportError('Base64 encoding is unavailable in this environment');
  return btoa(binary);
}
function base64ToBytes(encoded: string): Uint8Array {
  const raw = encoded.includes(',') ? encoded.slice(encoded.indexOf(',') + 1) : encoded;
  if (typeof atob !== 'function') throw new CharacterImportError('Base64 decoding is unavailable in this environment');
  const binary = atob(raw);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

/** Strictly retains inert vector primitives; strips scripts, event handlers, styles and external refs. */
export function sanitizeSvg(source: string): string {
  if (source.length > IMPORT_LIMITS.textBytes) throw new CharacterImportError('SVG exceeds the 2 MB limit');
  if (!/<svg\b/i.test(source) || !/<\/svg\s*>/i.test(source)) throw new CharacterImportError('Invalid or incomplete SVG document');
  let svg = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?(?:xml|[^?]*)\?>/gi, '');
  svg = svg.replace(/<(script|foreignObject|iframe|object|embed|audio|video|style|link|image)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  svg = svg.replace(/<(script|foreignObject|iframe|object|embed|audio|video|style|link|image)\b[^>]*\/?>/gi, '');
  const allowedTags = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','defs','linearGradient','radialGradient','stop','clipPath','mask','use']);
  const allowedAttrs = new Set(['xmlns','viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-opacity','opacity','transform','id','offset','stop-color','stop-opacity','gradientUnits','gradientTransform','font-size','font-family','font-weight','text-anchor','dominant-baseline','clip-path','mask','href']);
  svg = svg.replace(/<\/?([\w:-]+)([^>]*)>/g, (tag, rawName: string, rawAttrs: string) => {
    const name = rawName.split(':').pop()!;
    if (!allowedTags.has(name)) return '';
    const closing = /^<\//.test(tag);
    if (closing) return `</${name}>`;
    const attrs: string[] = [];
    rawAttrs.replace(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (_m, rawKey: string, _quoted: string, dq: string, sq: string) => {
      const key = rawKey.toLowerCase(); const originalKey = rawKey;
      const val = dq ?? sq ?? '';
      if (key.startsWith('on') || key === 'style' || !allowedAttrs.has(originalKey)) return '';
      if ((key === 'href' || key === 'xlink:href') && !/^#[\w.-]+$/.test(val)) return '';
      const validSvgNamespace = key === 'xmlns' && val === 'http://www.w3.org/2000/svg';
      if (/url\s*\(\s*(?!['"]?#)[^)]/i.test(val) || (!validSvgNamespace && /javascript:|data:|https?:/i.test(val))) return '';
      attrs.push(`${originalKey}="${val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`);
      return '';
    });
    return `<${name}${attrs.length ? ` ${attrs.join(' ')}` : ''}${/\/\s*>$/.test(tag) ? ' /' : ''}>`;
  });
  const root = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!root || /<svg\b[^>]*\son[a-z]+\s*=/i.test(svg)) throw new CharacterImportError('SVG failed sanitization');
  return svg;
}

function parseJson(text: string, warnings: string[] = []): CharacterDesign {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new CharacterImportError('Invalid JSON: check syntax and quotes'); }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const envelope = value as Record<string, unknown>;
    if (envelope.format === 'omnistudio-character' && envelope.character) return sanitizeCharacterAssets(migrateCharacter(envelope.character), warnings);
    if (envelope.character && typeof envelope.character === 'object') return sanitizeCharacterAssets(migrateCharacter(envelope.character), warnings);
  }
  return sanitizeCharacterAssets(migrateCharacter(value), warnings);
}

function sanitizeCharacterAssets(character: CharacterDesign, warnings: string[] = []): CharacterDesign {
  const schema = character.schema;
  if (!schema) return character;
  const assets = schema.assets.map(asset => {
    if (!asset.mimeType.startsWith('image/')) return asset;
    try {
      const assetBytes = base64ToBytes(asset.data);
      if (asset.mimeType !== 'image/svg+xml' && detectImageMime(assetBytes) !== asset.mimeType) throw new CharacterImportError(`Image data for ${asset.name} does not match ${asset.mimeType}`);
      if (asset.mimeType !== 'image/svg+xml') return asset;
      const svgText = new TextDecoder().decode(assetBytes);
      const safeSvg = sanitizeSvg(svgText);
      if (safeSvg !== svgText) warnings.push(`Unsafe or unsupported SVG features were removed from ${asset.name}.`);
      return { ...asset, data: `data:image/svg+xml;base64,${bytesToBase64(new TextEncoder().encode(safeSvg))}` };
    } catch (error) { throw new CharacterImportError(`Asset ${asset.name} is invalid`, [error instanceof Error ? error.message : 'Asset validation failed']); }
  });
  return validateCharacter({ ...character, schema: { ...schema, assets } });
}

/** Parses only generated export statements whose initializers are JSON literals or a template literal for characterSvg. No JavaScript is executed. */
function parseOfficialJavaScript(source: string, warnings: string[] = []): CharacterDesign {
  if (source.length > IMPORT_LIMITS.textBytes) throw new CharacterImportError('JavaScript source exceeds the 2 MB limit');
  const declaration = source.match(/export\s+const\s+characterData\s*=\s*/);
  if (!declaration) throw new CharacterImportError('Expected official export `export const characterData = ...`');
  const charStart = declaration.index! + declaration[0].length;
  const char = migrateCharacter(JSON.parse(extractAnyJsonLiteral(source, charStart)));
  const outfitDecl = source.match(/export\s+const\s+outfitData\s*=\s*/);
  if (outfitDecl) {
    try { char.schema!.extensions.officialExportOutfit = JSON.parse(extractAnyJsonLiteral(source, outfitDecl.index! + outfitDecl[0].length)); }
    catch { throw new CharacterImportError('Invalid official outfitData JSON literal'); }
  }
  // Remove supported export declarations only after parsing their JSON literals. No source code is evaluated.
  let remainder = source.replace(/^\s*\/\/[^\n]*(?:\n|$)/gm, '');
  for (const name of ['characterData', 'outfitData', 'characterSvg']) {
    const expression = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*`, 'g');
    const match = expression.exec(remainder);
    if (!match) continue;
    const literalStart = match.index + match[0].length;
    const literal = extractAnyJsonLiteral(remainder, literalStart);
    let end = literalStart + literal.length;
    while (/\s/.test(remainder[end] ?? '')) end++;
    if (remainder[end] !== ';') throw new CharacterImportError(`Expected semicolon after ${name} JSON literal`);
    if (name === 'characterSvg') { try { if (typeof JSON.parse(literal) !== 'string') throw new Error(); } catch { throw new CharacterImportError('characterSvg must be a JSON string literal'); } }
    remainder = remainder.slice(0, match.index) + remainder.slice(end + 1);
  }
  remainder = remainder.replace(/export\s+function\s+renderCharacter\s*\(containerId\)\s*\{\s*const\s+el\s*=\s*document\.getElementById\(containerId\);\s*if\s*\(el\)\s*el\.innerHTML\s*=\s*characterSvg;?\s*\}/, '');
  if (remainder.trim()) throw new CharacterImportError('Unsupported JavaScript: only official JSON exports and the known inert preview helper are accepted');
  return sanitizeCharacterAssets(char, warnings);
}
function extractAnyJsonLiteral(source: string, start: number): string {
  let i = start; while (/\s/.test(source[i] ?? '')) i++;
  if (source[i] === '"') {
    let escaped = false;
    for (let end = i + 1; end < source.length; end++) { const c = source[end]; if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') return source.slice(i, end + 1); }
    throw new CharacterImportError('Incomplete JSON string literal');
  }
  return extractJsonLiteral(source, i);
}
function extractJsonLiteral(source: string, start: number): string {
  let i = start; while (/\s/.test(source[i] ?? '')) i++;
  const open = source[i]; if (open !== '{' && open !== '[') throw new CharacterImportError('Only JSON object/array literals are allowed in official JavaScript exports');
  const stack: string[] = []; let inString = false; let escaped = false;
  for (let end = i; end < source.length; end++) {
    const c = source[end];
    if (inString) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') inString = false; continue; }
    if (c === '"') inString = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') { const expected = c === '}' ? '{' : '['; if (stack.pop() !== expected) throw new CharacterImportError('Malformed JSON literal'); if (!stack.length) return source.slice(i, end + 1); }
  }
  throw new CharacterImportError('Incomplete JSON literal in JavaScript export');
}

function assetCharacter(name: string, mime: string, data: string, renderer: 'svg-layers' | 'sprite-parts'): CharacterDesign {
  const id = safeId(name.replace(/\.[^.]+$/, ''));
  const asset: CharacterAsset = { id: `${id}_asset`, name, mimeType: mime, data, version: 1 };
  const layer: CharacterLayer = { id: `${id}_layer`, name, assetId: asset.id, visible: true, order: 0, x: 150, y: 200, width: 300, height: 400, anchor: { x: 0.5, y: 0.5 } };
  const character: CharacterDesign = { id, name: name.replace(/\.[^.]+$/, '') || 'Imported Character', skinTone: '#f6d8ae', hairStyle: 'none', hairColor: '#334155', eyeColor: '#06b6d4', expression: 'neutral', outfitId: '', scale: 1, animation: 'idle', role: 'Imported', schema: createCharacterSchema({ renderer, assets: [asset], layers: [layer] }) };
  return validateCharacter(character);
}

export function parseCharacterText(source: string, filename = 'character.json'): CharacterImportResult {
  const text = source.trim();
  if (!text) throw new CharacterImportError('No character data was provided');
  if (text.length > IMPORT_LIMITS.textBytes) throw new CharacterImportError('Input exceeds the 2 MB text limit');
  const ext = filename.toLowerCase().split('.').pop();
  if (text.startsWith('<') || ext === 'svg') {
    const sanitized = sanitizeSvg(text);
    const warnings = sanitized !== text ? ['Unsupported or unsafe SVG elements/attributes were removed.'] : [];
    const data = `data:image/svg+xml;base64,${bytesToBase64(new TextEncoder().encode(sanitized))}`;
    return { character: assetCharacter(filename, 'image/svg+xml', data, 'svg-layers'), format: 'svg', warnings, assetsImported: 1 };
  }
  if (/\bexport\s+const\s+characterData\s*=/.test(text) || ext === 'js' || ext === 'mjs') { const warnings: string[] = []; return { character: parseOfficialJavaScript(text, warnings), format: 'javascript', warnings, assetsImported: 0 }; }
  const warnings: string[] = [];
  return { character: parseJson(text, warnings), format: 'json', warnings, assetsImported: 0 };
}

const mimeFor = (file: File) => {
  const ext = file.name.toLowerCase().split('.').pop();
  const types: Record<string, string> = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml' };
  const type = types[ext || ''];
  if (!type || (file.type && file.type !== type && !(ext === 'jpg' && file.type === 'image/jpeg'))) throw new CharacterImportError('Unsupported image type or extension/MIME mismatch');
  return type;
};

function detectImageMime(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  if (String.fromCharCode(...bytes.subarray(0, 6)) === 'GIF87a' || String.fromCharCode(...bytes.subarray(0, 6)) === 'GIF89a') return 'image/gif';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(4, 8)) === 'ftyp' && /avif|avis/.test(String.fromCharCode(...bytes.subarray(8, 16)))) return 'image/avif';
  return undefined;
}

export async function importCharacterFile(file: File, onProgress?: (progress: number) => void): Promise<CharacterImportResult> {
  if (!file.size || file.size > IMPORT_LIMITS.fileBytes) throw new CharacterImportError(`File must be non-empty and at most ${IMPORT_LIMITS.fileBytes / 1024 / 1024} MB`);
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'zip') return importCharacterZip(file, onProgress);
  if (['json','js','mjs','svg'].includes(ext || '')) return parseCharacterText(await file.text(), file.name);
  const mime = mimeFor(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageMime(bytes);
  if (mime !== 'image/svg+xml' && detected !== mime) throw new CharacterImportError(`Image content does not match its declared type (${file.name})`);
  const data = mime === 'image/svg+xml' ? `data:${mime};base64,${bytesToBase64(new TextEncoder().encode(sanitizeSvg(new TextDecoder().decode(bytes))))}` : asDataUrl(mime, bytes);
  return { character: assetCharacter(file.name, mime, data, 'sprite-parts'), format: 'image', warnings: [], assetsImported: 1 };
}

async function importCharacterZip(file: File, onProgress?: (progress: number) => void): Promise<CharacterImportResult> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: true }); } catch { throw new CharacterImportError('ZIP archive is damaged or invalid'); }
  const entries = Object.values(zip.files).filter(f => !f.dir);
  if (entries.length > IMPORT_LIMITS.zipEntries) throw new CharacterImportError('ZIP contains too many files (maximum 200)');
  let expanded = 0;
  for (const entry of entries) {
    const originalName = (entry as any).unsafeOriginalName ?? entry.name;
    const normalized = originalName.replace(/\\/g, '/');
    if (normalized.startsWith('/') || normalized.split('/').some((part: string) => part === '..') || /^[A-Za-z]:/.test(normalized)) throw new CharacterImportError(`Unsafe ZIP path: ${originalName}`);
    expanded += (entry as any)._data?.uncompressedSize ?? 0;
    if (expanded > IMPORT_LIMITS.expandedBytes) throw new CharacterImportError('ZIP expanded size exceeds the 80 MB limit');
  }
  const definition = entries.find(e => ['character.json','manifest.json'].includes(e.name.toLowerCase().split('/').pop()!));
  if (!definition) throw new CharacterImportError('ZIP must contain character.json or manifest.json');
  let parsed: unknown;
  try { parsed = JSON.parse(await definition.async('string')); } catch { throw new CharacterImportError(`Invalid JSON in ${definition.name}`); }
  const doc = parsed as any;
  const rawCharacter = doc?.character ?? doc;
  const rawSchema = rawCharacter?.schema ?? {};
  const sourceLayers = [...(rawSchema.layers ?? rawCharacter.layers ?? [])];
  const sourceAssets = [...(rawSchema.assets ?? rawCharacter.assets ?? [])];
  const externalAssetPaths = new Map(sourceAssets.filter((item: any) => item?.path || item?.src).map((item: any) => [item.id, item.path ?? item.src]));
  // Temporarily omit path-based references so legacy migration can validate the embedded portion first.
  const embeddedLayers = sourceLayers.filter((item: any) => !item?.path && !item?.src && !externalAssetPaths.has(item?.assetId));
  const embeddedAssets = sourceAssets.filter((item: any) => !item?.path && !item?.src);
  const migrationInput = rawCharacter.schema ? { ...rawCharacter, schema: { ...rawSchema, layers: embeddedLayers, assets: embeddedAssets } } : { ...rawCharacter, layers: embeddedLayers, assets: embeddedAssets };
  let character = migrateCharacter(migrationInput);
  const warnings: string[] = [];
  const assets = [...(character.schema?.assets ?? [])];
  const layers = [...(character.schema?.layers ?? [])];
  const externalLayers = sourceLayers.filter((item: any) => item?.path || item?.src || externalAssetPaths.has(item?.assetId));
  const externalAssets = sourceAssets.filter((item: any) => item?.path || item?.src);
  const refs = new Set<string>();
  for (const item of [...externalLayers, ...externalAssets, ...(doc?.assets ?? [])]) if (item?.path || item?.src) refs.add(item.path ?? item.src);
  const pathToAsset = new Map<string, string>();
  for (const path of refs) {
    const normalized = String(path).replace(/\\/g, '/').replace(/^\.\//, '');
    if (normalized.startsWith('/') || normalized.split('/').includes('..')) throw new CharacterImportError(`Unsafe asset path: ${path}`);
    const entry = entries.find(e => e.name === normalized || e.name === `${definition.name.substring(0, definition.name.lastIndexOf('/') + 1)}${normalized}`);
    if (!entry) throw new CharacterImportError(`Missing referenced asset: ${normalized}`, [`Missing asset: ${normalized}`]);
    const ext = entry.name.toLowerCase().split('.').pop();
    const mimeByExt: Record<string, string> = { svg:'image/svg+xml',png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',avif:'image/avif',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg' };
    const mime = mimeByExt[ext || '']; if (!mime) throw new CharacterImportError(`Unsupported referenced asset type: ${entry.name}`);
    const bytes = await entry.async('uint8array');
    if (mime.startsWith('image/') && mime !== 'image/svg+xml' && detectImageMime(bytes) !== mime) throw new CharacterImportError(`Asset content does not match its type: ${entry.name}`);
    let data: string;
    if (mime === 'image/svg+xml') {
      const sourceSvg = new TextDecoder().decode(bytes); const safeSvg = sanitizeSvg(sourceSvg);
      if (sourceSvg !== safeSvg) warnings.push(`Unsafe or unsupported SVG features were removed from ${entry.name}.`);
      data = `data:${mime};base64,${bytesToBase64(new TextEncoder().encode(safeSvg))}`;
    } else data = asDataUrl(mime, bytes);
    const originalAssetId = [...externalAssetPaths].find(([, path]) => String(path).replace(/\\/g, '/').replace(/^\.\//, '') === normalized)?.[0];
    const assetId = originalAssetId && /^[\w.-]{1,128}$/.test(originalAssetId) ? originalAssetId : safeId(entry.name.replace(/\.[^.]+$/, ''));
    assets.push({ id: assetId, name: entry.name.split('/').pop()!, mimeType: mime, data, version: 1 }); pathToAsset.set(normalized, assetId);
    onProgress?.(Math.min(95, Math.round(pathToAsset.size / Math.max(1, refs.size) * 100)));
  }
  for (const sourceLayer of externalLayers as any[]) {
    const refPath = sourceLayer.path ?? sourceLayer.src ?? externalAssetPaths.get(sourceLayer.assetId);
    const assetId = pathToAsset.get(refPath);
    if (!assetId) throw new CharacterImportError(`Missing layer asset ${refPath}`);
    const { path: _path, src: _src, ...layer } = sourceLayer; layers.push({ ...layer, assetId });
  }
  if (!layers.length && assets.length) for (const asset of assets) if (asset.mimeType.startsWith('image/')) layers.push({ id: `${asset.id}_layer`, name: asset.name, assetId: asset.id, visible: true, order: layers.length, x: 0, y: 0, width: 300, height: 400 });
  character = sanitizeCharacterAssets(validateCharacter({ ...character, schema: { ...character.schema!, assets, layers, renderer: layers.some(l => l.part) ? 'sprite-parts' : character.schema!.renderer } }), warnings);
  return { character, format: 'zip', warnings, assetsImported: assets.length };
}
