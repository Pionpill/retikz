import type { IRAnimationTrack, Scene, ScenePrimitive } from '@retikz/core';
import { visitSceneContent } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { RuntimeScenePrimitive, SceneRuntimeSnapshot } from '@retikz/reconciler';
import type { SceneIdentity } from '@retikz/reconciler';

import type { EasingRegistry } from '../animation';
import type { RenderRuntimeConfig } from './config';
import { createSceneIdentityMap, runtimeStructuralEquals } from './shared';

/** 把 deeply readonly config easing tuples 复制为 renderer 消费形态 */
export const materializeEasingRegistry = (config: RenderRuntimeConfig): EasingRegistry | undefined => {
  const source = config.animation?.easings;
  if (source === undefined) return undefined;

  const result: EasingRegistry = {};

  for (const [name, easing] of Object.entries(source)) {
    result[name] = typeof easing === 'function' ? easing : [easing[0], easing[1], easing[2], easing[3]];
  }

  return result;
};

/** 沿 canonical primitivePath 读取 occurrence 对应 primitive */
const primitiveAtPath = (
  snapshot: SceneRuntimeSnapshot,
  path: ReadonlyArray<number>,
): RuntimeScenePrimitive | undefined => {
  let children = snapshot.scene.primitives;
  let primitive: RuntimeScenePrimitive | undefined;

  for (const index of path) {
    primitive = Reflect.get(children, index);
    children = primitive.type === 'group' ? primitive.children : [];
  }

  return primitive;
};

/** 收集当前 occurrence 及资源内容的轨道，不纳入独立 authoring 子节点 */
export const occurrenceAnimationTracks = (
  primitive: RuntimeScenePrimitive | undefined,
  resources: SceneRuntimeSnapshot['scene']['resources'],
): Array<IRAnimationTrack> => {
  if (!primitive) return [];
  const content = primitive as unknown as ScenePrimitive;
  const tracks: Array<IRAnimationTrack> = [];
  visitSceneContent(
    {
      primitives: [content.type === 'group' ? { ...content, children: [] } : content],
      resources: resources as unknown as Scene['resources'],
    },
    current => {
      if (current.animations) tracks.push(...current.animations);
    },
  );
  return tracks;
};

/** Animated occurrence descriptor 变化类型 */
export const SceneAnimationOccurrenceChangeKind = {
  Added: 'added',
  Changed: 'changed',
  Unchanged: 'unchanged',
  Removed: 'removed',
} as const;

/** Animated occurrence descriptor 变化类型取值 */
export type SceneAnimationOccurrenceChangeKind = ValueOf<typeof SceneAnimationOccurrenceChangeKind>;

/** 单个 animated occurrence 在相邻 lineage 间的 descriptor/public id 变化 */
export type SceneAnimationOccurrenceChange = Readonly<{
  /** occurrence 的稳定 Runtime identity */
  identity: SceneIdentity;
  /** 当前 lineage 的 public id */
  currentPublicId?: string;
  /** 下一 lineage 的 public id */
  nextPublicId?: string;
  /** descriptor 相对变化 */
  kind: SceneAnimationOccurrenceChangeKind;
}>;

/** Scene root 与各 SceneIdentity 动画 descriptor 的结构化 diff */
export type SceneAnimationDescriptorDiff = Readonly<{
  /** Scene root animation descriptor 是否改变 */
  rootChanged: boolean;
  /** Animated occurrences 按当前顺序再追加新增项的变化集合 */
  occurrences: ReadonlyArray<SceneAnimationOccurrenceChange>;
}>;

/** 按 SceneIdentity 比较动画 descriptor，并独立记录 public id 迁移 */
export const diffSceneAnimationDescriptors = (
  current: SceneRuntimeSnapshot | undefined,
  next: SceneRuntimeSnapshot,
): SceneAnimationDescriptorDiff => {
  const currentEntries =
    current?.topology.flatMap(node => {
      const animations = occurrenceAnimationTracks(
        primitiveAtPath(current, node.primitivePath),
        current.scene.resources,
      );
      return animations.length === 0 ? [] : ([[node.identity, { animations, publicId: node.publicId }]] as const);
    }) ?? [];
  const nextEntries = next.topology.flatMap(node => {
    const animations = occurrenceAnimationTracks(primitiveAtPath(next, node.primitivePath), next.scene.resources);
    return animations.length === 0 ? [] : ([[node.identity, { animations, publicId: node.publicId }]] as const);
  });
  const currentByIdentity = createSceneIdentityMap(currentEntries);
  const nextByIdentity = createSceneIdentityMap(nextEntries);
  const occurrences: Array<SceneAnimationOccurrenceChange> = [];

  for (const [identity, entry] of currentEntries) {
    const candidate = nextByIdentity.get(identity);
    occurrences.push(
      Object.freeze({
        identity,
        ...(entry.publicId === undefined ? {} : { currentPublicId: entry.publicId }),
        ...(candidate?.publicId === undefined ? {} : { nextPublicId: candidate.publicId }),
        kind:
          candidate === undefined
            ? SceneAnimationOccurrenceChangeKind.Removed
            : runtimeStructuralEquals(entry.animations, candidate.animations)
              ? SceneAnimationOccurrenceChangeKind.Unchanged
              : SceneAnimationOccurrenceChangeKind.Changed,
      }),
    );
  }

  for (const [identity, entry] of nextEntries) {
    if (currentByIdentity.has(identity)) continue;

    occurrences.push(
      Object.freeze({
        identity,
        ...(entry.publicId === undefined ? {} : { nextPublicId: entry.publicId }),
        kind: SceneAnimationOccurrenceChangeKind.Added,
      }),
    );
  }

  return Object.freeze({
    rootChanged: current === undefined || !runtimeStructuralEquals(current.scene.animations, next.scene.animations),
    occurrences: Object.freeze(occurrences),
  });
};
