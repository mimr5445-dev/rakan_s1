import type { CharacterDesign, StudioProject } from '../types/studio';
import { migrateCharacter } from './characterSchema';

export interface CharacterRevision { id: string; label: string; createdAt: string; snapshot: CharacterDesign; }
const REVISIONS_KEY = 'characterRevisions';
export function getCharacterRevisions(character: CharacterDesign): CharacterRevision[] {
  const value = character.schema?.extensions[REVISIONS_KEY];
  return Array.isArray(value) ? value as CharacterRevision[] : [];
}
export function saveCharacterRevision(character: CharacterDesign, label = 'Saved version', maxVersions = 20): CharacterDesign {
  const snapshot = structuredClone(migrateCharacter(character));
  if (snapshot.schema) delete snapshot.schema.extensions[REVISIONS_KEY];
  const revisions = getCharacterRevisions(character);
  const revision: CharacterRevision = { id: `${character.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label, createdAt: new Date().toISOString(), snapshot };
  const schema = character.schema ?? migrateCharacter(character).schema!;
  return { ...character, schema: { ...schema, extensions: { ...schema.extensions, [REVISIONS_KEY]: [...revisions, revision].slice(-maxVersions) } } };
}
export function restoreCharacterRevision(character: CharacterDesign, revisionId: string): CharacterDesign {
  const revision = getCharacterRevisions(character).find(item => item.id === revisionId);
  if (!revision) throw new Error(`Character revision ${revisionId} was not found`);
  return { ...structuredClone(revision.snapshot), schema: { ...structuredClone(revision.snapshot.schema!), extensions: { ...revision.snapshot.schema!.extensions, [REVISIONS_KEY]: getCharacterRevisions(character) } } };
}
export function duplicateCharacter(character: CharacterDesign, id: string, name = `${character.name} Copy`): CharacterDesign {
  if (!/^[\w.-]{1,128}$/.test(id)) throw new Error('Invalid new character id');
  return { ...structuredClone(character), id, name, schema: character.schema ? structuredClone(character.schema) : migrateCharacter(character).schema };
}
/** List deletion is deliberately non-cascading: scene/project references are never rewritten. */
export function removeCharacterFromLibrary(project: StudioProject, id: string): StudioProject {
  if (!project.characters.some(character => character.id === id)) return project;
  const characters = project.characters.filter(character => character.id !== id);
  return { ...project, characters, activeCharacterId: project.activeCharacterId === id ? (characters[0]?.id ?? '') : project.activeCharacterId };
}
