import type { IRAnimationTrack } from '@retikz/core';
import type { RuntimeScenePrimitive, SceneRuntimeSnapshot } from '@retikz/reconciler';
import { createSceneIdentity } from '@retikz/reconciler';
import { expect, it } from 'vitest';

import { diffSceneAnimationDescriptors, occurrenceAnimationTracks } from '../../src/runtime/runtime-options';

it('共享 Pattern 的动画按使用处归属，资源更新和回滚不串用快照', () => {
  const track = (duration: number): IRAnimationTrack => ({
    property: 'opacity',
    duration,
    keyframes: [
      { at: 0, value: 0 },
      { at: 1, value: 1 },
    ],
  });
  const root = createSceneIdentity('animation-resource', ['root']);
  const groupIdentity = createSceneIdentity('animation-resource', ['group']);
  const childIdentities = ['A', 'B'].map(id => createSceneIdentity('animation-resource', [id]));
  const children: Array<RuntimeScenePrimitive> = ['A', 'B'].map(id => ({
    type: 'rect',
    id,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    fill: { kind: 'resourceRef', id: 'tile' },
  }));
  const group: RuntimeScenePrimitive = { type: 'group', animations: [track(25)], children };
  const snapshot = (revision: number, duration: number): SceneRuntimeSnapshot => ({
    revision,
    root,
    scene: {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      animations: [],
      primitives: [group],
      resources: [
        {
          kind: 'paint',
          id: 'tile',
          spec: { kind: 'pattern', shape: 'dots' },
          tile: {
            size: 10,
            motif: [
              {
                type: 'rect',
                id: 'local',
                x: 0,
                y: 0,
                width: 1,
                height: 1,
                animations: [track(duration)],
              },
            ],
          },
        },
      ],
    },
    topology: [
      { identity: groupIdentity, semanticOwner: groupIdentity, parent: root, order: 0, primitivePath: [0] },
      ...childIdentities.map((identity, index) => ({
        identity,
        semanticOwner: identity,
        parent: groupIdentity,
        order: index,
        primitivePath: [0, index],
      })),
    ],
  });
  const current = snapshot(0, 100);
  const next = snapshot(1, 200);
  expect(occurrenceAnimationTracks(group, current)).toEqual([track(25)]);
  expect(children.map(child => occurrenceAnimationTracks(child, current))).toEqual([[track(100)], [track(100)]]);
  expect(diffSceneAnimationDescriptors(current, next).occurrences.map(change => change.kind)).toEqual([
    'unchanged',
    'changed',
    'changed',
  ]);
  expect(children.map(child => occurrenceAnimationTracks(child, next))).toEqual([[track(200)], [track(200)]]);
  expect(children.map(child => occurrenceAnimationTracks(child, current))).toEqual([[track(100)], [track(100)]]);
});
