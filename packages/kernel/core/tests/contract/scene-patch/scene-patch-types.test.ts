import type { RuntimeIdentity } from '@retikz/runtime';

import { describe, expectTypeOf, it } from 'vitest';

import type {
  IRAnimationTrack,
  RuntimeDeepReadonly,
  RuntimeScene,
  RuntimeScenePrimitive,
  RuntimeSceneResource,
  ScenePatch,
  ScenePatchOperation,
  SceneRuntimeNode,
  SceneRuntimeSnapshot,
  SceneRuntimeSubtree,
  SceneRuntimeSubtreeNode,
} from '../../../src';

type ExpectedScenePatchOperation =
  | Readonly<{
      kind: 'insert';
      parent: RuntimeIdentity;
      before?: RuntimeIdentity;
      subtree: SceneRuntimeSubtree;
    }>
  | Readonly<{
      kind: 'update';
      identity: RuntimeIdentity;
      subtree: SceneRuntimeSubtree;
    }>
  | Readonly<{ kind: 'remove'; identity: RuntimeIdentity }>
  | Readonly<{
      kind: 'move';
      identity: RuntimeIdentity;
      parent: RuntimeIdentity;
      before?: RuntimeIdentity;
    }>
  | Readonly<{ kind: 'setLayout'; layout: RuntimeScene['layout'] }>
  | Readonly<{ kind: 'setResources'; resources: ReadonlyArray<RuntimeSceneResource> }>
  | Readonly<{ kind: 'setAnimations'; animations: RuntimeScene['animations'] }>
  | Readonly<{ kind: 'replaceScene'; snapshot: SceneRuntimeSnapshot }>;

describe('scene runtime patch contract', () => {
  it('公开 deeply readonly Scene snapshot 与 topology', () => {
    expectTypeOf<RuntimeScene['primitives']>().toEqualTypeOf<ReadonlyArray<RuntimeScenePrimitive>>();
    expectTypeOf<RuntimeScene['resources']>().toEqualTypeOf<ReadonlyArray<RuntimeSceneResource>>();
    expectTypeOf<RuntimeScene['animations']>().toEqualTypeOf<ReadonlyArray<RuntimeDeepReadonly<IRAnimationTrack>>>();
    expectTypeOf<Extract<RuntimeScenePrimitive, { type: 'group' }>['children']>().toEqualTypeOf<
      ReadonlyArray<RuntimeScenePrimitive>
    >();
    expectTypeOf<RuntimeScene['animations'][number]['keyframes']>().toEqualTypeOf<
      ReadonlyArray<RuntimeDeepReadonly<IRAnimationTrack['keyframes'][number]>>
    >();
    expectTypeOf<SceneRuntimeSnapshot['topology']>().toEqualTypeOf<ReadonlyArray<SceneRuntimeNode>>();
    expectTypeOf<SceneRuntimeSubtree['topology']>().toEqualTypeOf<ReadonlyArray<SceneRuntimeSubtreeNode>>();
  });

  it('Patch 只公开 revision envelope 与规范化 operation union', () => {
    expectTypeOf<ScenePatch['operations']>().toEqualTypeOf<ReadonlyArray<ScenePatchOperation>>();
    expectTypeOf<ScenePatchOperation['kind']>().toEqualTypeOf<
      'insert' | 'update' | 'remove' | 'move' | 'setLayout' | 'setResources' | 'setAnimations' | 'replaceScene'
    >();
    expectTypeOf<ScenePatchOperation>().toEqualTypeOf<ExpectedScenePatchOperation>();
  });
});
