import type { CharacterAnimationClip, CharacterBone, CharacterKeyframe } from '../types/studio';

export function sampleKeyframes(frames: CharacterKeyframe[], time: number, boneId: string): Required<Pick<CharacterKeyframe, 'x' | 'y' | 'rotation'>> {
  const keys = frames.filter(frame => frame.boneId === boneId).sort((a, b) => a.time - b.time);
  if (!keys.length) return { x: 0, y: 0, rotation: 0 };
  const before = [...keys].reverse().find(key => key.time <= time) ?? keys[0];
  const after = keys.find(key => key.time >= time) ?? keys[keys.length - 1];
  if (before === after || after.time === before.time) return { x: before.x ?? 0, y: before.y ?? 0, rotation: before.rotation ?? 0 };
  const ratio = Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)));
  const lerp = (a = 0, b = 0) => a + (b - a) * ratio;
  return { x: lerp(before.x, after.x), y: lerp(before.y, after.y), rotation: lerp(before.rotation, after.rotation) };
}

/** Blends independent reusable animation clips without mutating either clip. */
export function blendAnimationClips(a: CharacterAnimationClip, b: CharacterAnimationClip, time: number, weight: number): Map<string, { x: number; y: number; rotation: number }> {
  const t = Math.max(0, Math.min(1, weight));
  const durationA = Math.max(a.duration, 0.0001), durationB = Math.max(b.duration, 0.0001);
  const ta = a.loop ? ((time % durationA) + durationA) % durationA : Math.min(time, durationA);
  const tb = b.loop ? ((time % durationB) + durationB) % durationB : Math.min(time, durationB);
  const boneIds = new Set([...a.keyframes, ...b.keyframes].map(k => k.boneId));
  const result = new Map<string, { x: number; y: number; rotation: number }>();
  for (const id of boneIds) {
    const av = sampleKeyframes(a.keyframes, ta, id), bv = sampleKeyframes(b.keyframes, tb, id);
    result.set(id, { x: av.x + (bv.x - av.x) * t, y: av.y + (bv.y - av.y) * t, rotation: av.rotation + (bv.rotation - av.rotation) * t });
  }
  return result;
}

export function solveTwoBoneIK(root: { x: number; y: number }, target: { x: number; y: number }, upperLength: number, lowerLength: number): { rootRotation: number; jointRotation: number; reachableTarget: { x: number; y: number } } {
  const a = Math.max(0.0001, upperLength), b = Math.max(0.0001, lowerLength);
  const dx = target.x - root.x, dy = target.y - root.y;
  const rawDistance = Math.hypot(dx, dy) || 0.0001;
  const distance = Math.max(Math.abs(a - b) + 0.0001, Math.min(a + b - 0.0001, rawDistance));
  const direction = Math.atan2(dy, dx);
  const rootOffset = Math.acos(Math.max(-1, Math.min(1, (a * a + distance * distance - b * b) / (2 * a * distance))));
  const jointInternal = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - distance * distance) / (2 * a * b))));
  const actualTarget = { x: root.x + Math.cos(direction) * distance, y: root.y + Math.sin(direction) * distance };
  return { rootRotation: (direction - rootOffset) * 180 / Math.PI, jointRotation: (Math.PI - jointInternal) * 180 / Math.PI, reachableTarget: actualTarget };
}

export function resolveBoneWorldTransforms(bones: CharacterBone[], pose: Map<string, { x: number; y: number; rotation: number }> = new Map()): Map<string, { x: number; y: number; rotation: number }> {
  const byId = new Map(bones.map(bone => [bone.id, bone]));
  const resolved = new Map<string, { x: number; y: number; rotation: number }>();
  const visiting = new Set<string>();
  const resolve = (id: string): { x: number; y: number; rotation: number } => {
    const cached = resolved.get(id); if (cached) return cached;
    const bone = byId.get(id); if (!bone) return { x: 0, y: 0, rotation: 0 };
    if (visiting.has(id)) throw new Error(`Skeleton cycle detected at bone ${id}`);
    visiting.add(id);
    const local = pose.get(id) ?? { x: 0, y: 0, rotation: 0 };
    const parent = bone.parentId ? resolve(bone.parentId) : { x: 0, y: 0, rotation: 0 };
    const rad = parent.rotation * Math.PI / 180;
    const result = { x: parent.x + (bone.x + local.x) * Math.cos(rad) - (bone.y + local.y) * Math.sin(rad), y: parent.y + (bone.x + local.x) * Math.sin(rad) + (bone.y + local.y) * Math.cos(rad), rotation: parent.rotation + bone.rotation + local.rotation };
    visiting.delete(id); resolved.set(id, result); return result;
  };
  for (const bone of bones) resolve(bone.id);
  return resolved;
}
