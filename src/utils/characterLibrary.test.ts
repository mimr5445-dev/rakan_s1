import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateCharacter, getCharacterRevisions, removeCharacterFromLibrary, restoreCharacterRevision, saveCharacterRevision } from './characterLibrary';
import type { CharacterDesign, StudioProject } from '../types/studio';

const character: CharacterDesign = { id:'hero',name:'Hero',role:'scout',skinTone:'#abc',hairStyle:'none',hairColor:'#000',eyeColor:'#fff',expression:'neutral',outfitId:'armor',scale:1,animation:'idle' };
test('character versions can be saved and restored without losing later history', () => {
  const saved = saveCharacterRevision(character,'Before edits');
  const edited = { ...saved, name:'Edited hero' };
  const restored = restoreCharacterRevision(edited,getCharacterRevisions(saved)[0].id);
  assert.equal(restored.name,'Hero');
  assert.equal(getCharacterRevisions(restored).length,1);
});
test('duplicate changes character id but retains outfits and animation relationships', () => {
  const copied = duplicateCharacter({...character, schema: {schemaVersion:1,renderer:'procedural',metadata:{},assets:[],layers:[],skeleton:{bones:[]},animations:[],expressions:{},wardrobeIds:['armor'],materials:{},audio:{voiceAssetIds:[]},variants:[],extensions:{}}},'hero-copy');
  assert.equal(copied.id,'hero-copy'); assert.equal(copied.outfitId,'armor'); assert.deepEqual(copied.schema?.wardrobeIds,['armor']);
});
test('library removal does not mutate another saved project snapshot or its character links', () => {
  const project = { characters:[character],activeCharacterId:'hero',name:'scene-save' } as unknown as StudioProject;
  const removed = removeCharacterFromLibrary(project,'hero');
  assert.equal(project.characters.length,1);
  assert.equal(removed.characters.length,0);
  assert.equal(removed.activeCharacterId,'');
});
