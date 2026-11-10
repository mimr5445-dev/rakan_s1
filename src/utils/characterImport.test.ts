import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { CharacterRenderer } from './characterRenderer';
import { importCharacterFile, parseCharacterText, sanitizeSvg, CharacterImportError } from './characterImport';
import { migrateCharacter } from './characterSchema';
import { exportStudioProjectZip } from './projectZip';
import { DEFAULT_STUDIO_PROJECT } from './storage';
import type { CharacterDesign, WardrobeItem } from '../types/studio';

const outfit: WardrobeItem = { id:'outfit_blue', name:'Blue Armor', category:'armor', topColor:'#123456', bottomColor:'#222222', accentColor:'#f0c000', headwear:'crown', cape:true, capeColor:'#770000', weapon:'sword', shoesColor:'#111111' };
const fullCharacter: CharacterDesign = {
  id:'hero-001', name:'Mira', role:'Scout', skinTone:'#e0bb95', hairStyle:'long', hairColor:'#78350f', eyeColor:'#10b981', expression:'happy', outfitId:outfit.id, scale:1.2, animation:'walk',
  schema:{ schemaVersion:1, renderer:'rigged', metadata:{ description:'Full test hero', tags:['hero','test'], author:'Studio' }, assets:[{id:'part-a',name:'arm.png',mimeType:'image/png',data:'data:image/png;base64,iVBORw0KGgo=',version:3}], layers:[{id:'arm-layer',name:'Arm',assetId:'part-a',visible:true,order:2,x:12,y:23,width:40,height:70,rotation:4,anchor:{x:0.5,y:1},part:'arm'}], skeleton:{bones:[{id:'root',name:'Root',x:0,y:0,length:10,rotation:0},{id:'arm',name:'Arm',parentId:'root',x:10,y:20,length:40,rotation:3}]}, animations:[{id:'walk',name:'walk',duration:1,loop:true,keyframes:[{time:0,boneId:'arm',rotation:-15},{time:.5,boneId:'arm',rotation:15}]}], expressions:{smile:{mouth:'open'}}, wardrobeIds:[outfit.id], materials:{cloth:{color:'#123456'}}, audio:{voiceAssetIds:['voice-1'],lipSync:{enabled:true,phonemeMap:{A:'mouth-open'}}}, variants:[{id:'winter',name:'Winter',overrides:{materials:{cloth:{color:'#fff'}}}}], extensions:{vendor:{custom:42}}
  }
};
const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
const blobPart = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;

 test('documented complete character example imports and renders', async () => {
  const source = await readFile(new URL('../../examples/character-v1.json', import.meta.url), 'utf8');
  const imported = parseCharacterText(source);
  assert.equal(imported.character.id, 'sample-hero');
  assert.equal(imported.character.schema?.layers.length, 2);
  assert.ok(CharacterRenderer.generateSvg(imported.character).includes('<image'));
});

test('official export -> import preserves identity, schema, wardrobe, animations and extension data', () => {
  const code = CharacterRenderer.generateCode(fullCharacter, outfit);
  const result = parseCharacterText(code);
  assert.equal(result.format, 'javascript');
  const expected = structuredClone(fullCharacter);
  expected.schema!.extensions.officialExportOutfit = outfit;
  assert.deepEqual(result.character, expected);
  assert.deepEqual(result.character.schema?.extensions.officialExportOutfit, outfit);
  const next = parseCharacterText(CharacterRenderer.generateCode(result.character));
  assert.deepEqual(next.character, result.character);
});

test('JSON schema envelope and multiple layers import without losing fields', () => {
  const result = parseCharacterText(JSON.stringify({format:'omnistudio-character',schemaVersion:1,character:fullCharacter}));
  assert.deepEqual(result.character, fullCharacter);
  assert.equal(result.character.schema?.layers.length, 1);
  assert.equal(result.character.schema?.layers[0].part, 'arm');
});

test('rejects arbitrary JavaScript without executing it', () => {
  (globalThis as any).__characterImportExecuted = false;
  const malicious = `export const characterData = ${JSON.stringify(fullCharacter)}; globalThis.__characterImportExecuted = true;`;
  assert.throws(() => parseCharacterText(malicious, 'character.js'), CharacterImportError);
  assert.equal((globalThis as any).__characterImportExecuted, false);
  delete (globalThis as any).__characterImportExecuted;
});

test('legacy flat character migrates with its identity and outfit relationship', () => {
  const migrated = migrateCharacter({id:'legacy_1',name:'Old hero',role:'Mage',outfitId:'wardrobe-7',hairColor:'#abc',customField:{keep:true}});
  assert.equal(migrated.id,'legacy_1'); assert.equal(migrated.outfitId,'wardrobe-7');
  assert.equal(migrated.schema?.schemaVersion,1); assert.deepEqual((migrated as any).customField,{keep:true});
});

test('SVG sanitizer removes scripts, inline handlers, styles and external references', () => {
  const safe = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><rect width="10" height="10" fill="red" style="background:url(https://evil)"/><image href="https://evil/x.png"/></svg>');
  assert.ok(!/script|onload|style=|https:\/\/evil|<image/i.test(safe));
  assert.ok(safe.includes('<rect'));
});

test('SVG import renders as an inert layered image after sanitization', () => {
  const result = parseCharacterText('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#f00"/></svg>', 'portrait.svg');
  assert.equal(result.character.schema?.renderer,'svg-layers');
  const rendered = CharacterRenderer.generateSvg(result.character);
  assert.ok(rendered.includes('data:image/svg+xml;base64,'));
  assert.ok(!rendered.includes('<script'));
});

test('embedded SVG inside untrusted JSON is sanitized before preview/render', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><script>globalThis.pwned=true</script><rect width="2" height="2" onload="alert(1)"/></svg>';
  const encoded = btoa(svg);
  const imported = parseCharacterText(JSON.stringify({ ...fullCharacter, schema:{ ...fullCharacter.schema!, renderer:'svg-layers', assets:[{id:'vector',name:'unsafe.svg',mimeType:'image/svg+xml',data:`data:image/svg+xml;base64,${encoded}`}], layers:[{id:'vector-layer',name:'vector',assetId:'vector',visible:true,order:0,x:0,y:0,width:2,height:2}] } }));
  assert.ok(imported.warnings.length > 0);
  const rendered = CharacterRenderer.generateSvg(imported.character);
  assert.ok(!rendered.includes('globalThis.pwned'));
  assert.ok(!rendered.includes('onload'));
});

test('renderer supports layered PNG parts with separate bone animation', () => {
  const imageCharacter = migrateCharacter({ ...fullCharacter, schema:{...fullCharacter.schema!, renderer:'sprite-parts', assets:[{id:'a',name:'body.png',mimeType:'image/png',data:'data:image/png;base64,iVBORw0KGgo='}], layers:[{id:'l',name:'Body',assetId:'a',visible:true,order:0,x:0,y:0,width:30,height:40,part:'arm'}] } });
  const svg = CharacterRenderer.generateSvg(imageCharacter);
  assert.ok(svg.includes('<image')); assert.ok(svg.includes('data:image/png;base64'));
});

test('PNG imports validate extension, MIME and actual file signature', async () => {
  const file = new File([blobPart(png)], 'portrait.png', {type:'image/png'});
  const result = await importCharacterFile(file);
  assert.equal(result.format,'image'); assert.equal(result.assetsImported,1);
  await assert.rejects(() => importCharacterFile(new File(['not png'], 'bad.png', {type:'image/png'})), CharacterImportError);
});

test('ZIP package resolves image layers and reports missing referenced files', async () => {
  const manifest = { ...fullCharacter, schema:{...fullCharacter.schema!, renderer:'sprite-parts', assets:[{id:'body',name:'Body',path:'assets/body.png',mimeType:'image/png'}], layers:[{id:'body-layer',name:'Body',assetId:'body',visible:true,order:0,x:0,y:0,width:30,height:40}] } };
  const zip = new JSZip(); zip.file('character.json',JSON.stringify(manifest)); zip.file('assets/body.png',png);
  const good = await importCharacterFile(new File([blobPart(await zip.generateAsync({type:'uint8array'}))], 'hero.zip', {type:'application/zip'}));
  assert.equal(good.format,'zip'); assert.equal(good.assetsImported,1); assert.equal(good.character.schema?.layers[0].assetId,'body');
  const brokenZip = new JSZip(); brokenZip.file('character.json',JSON.stringify(manifest));
  const brokenBytes = await brokenZip.generateAsync({type:'uint8array'});
  await assert.rejects(() => importCharacterFile(new File([blobPart(brokenBytes)], 'broken.zip')), /Missing referenced asset/);
});

test('OmniStudio project ZIP contains an importable character package', async () => {
  const archive = await exportStudioProjectZip(DEFAULT_STUDIO_PROJECT);
  const imported = await importCharacterFile(new File([await archive.arrayBuffer()], 'studio.zip'));
  assert.equal(imported.format, 'zip');
  assert.ok(DEFAULT_STUDIO_PROJECT.characters.some(character => character.id === imported.character.id));
  assert.equal(imported.character.schema?.schemaVersion, 1);
});

test('ZIP rejects traversal paths', async () => {
  const zip = new JSZip(); zip.file('character.json',JSON.stringify(fullCharacter)); zip.file('../evil.png',png);
  const file = new File([blobPart(await zip.generateAsync({type:'uint8array'}))], 'unsafe.zip');
  await assert.rejects(() => importCharacterFile(file), /Unsafe ZIP path/);
});

test('malformed JSON and duplicate/missing asset references fail validation', () => {
  assert.throws(() => parseCharacterText('{nope'), /Invalid JSON/);
  assert.throws(() => parseCharacterText(JSON.stringify({...fullCharacter,schema:{...fullCharacter.schema!,layers:[{id:'dangling',assetId:'missing',visible:true,order:0,x:0,y:0}]}})), /missing asset/);
});

test('skeleton transforms, keyframe interpolation and clip blending are functional', async () => {
  const animation = await import('./characterAnimation');
  const pose = animation.sampleKeyframes([{time:0,boneId:'a',rotation:0},{time:1,boneId:'a',rotation:90}],.5,'a');
  assert.equal(pose.rotation,45);
  const ik = animation.solveTwoBoneIK({x:0,y:0},{x:10,y:0},6,6);
  assert.ok(Math.abs(Math.hypot(ik.reachableTarget.x,ik.reachableTarget.y)-10)<0.001);
  assert.ok(Number.isFinite(ik.rootRotation) && Number.isFinite(ik.jointRotation));
  const world = animation.resolveBoneWorldTransforms([{id:'root',name:'root',x:10,y:10,length:1,rotation:0},{id:'a',name:'arm',parentId:'root',x:5,y:0,length:1,rotation:0}],new Map([['root',{x:0,y:0,rotation:90}]]));
  assert.ok(Math.abs(world.get('a')!.x-10)<0.001); assert.ok(Math.abs(world.get('a')!.y-15)<0.001);
});
