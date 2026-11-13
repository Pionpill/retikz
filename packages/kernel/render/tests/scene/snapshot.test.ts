import type { IRScene } from '@retikz/core';
import type { ReconcilerResult } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';
import { expect, it } from 'vitest';

import type { RuntimeScenePrimitive } from '../../src/scene';
import { createFullSceneRuntimeSnapshot } from '../../src/scene';

const identityKey = (identity: { owner: string; path: ReadonlyArray<string> }): string =>
  `${identity.owner}:${identity.path.join('/')}`;

const primitivePaths = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  prefix: ReadonlyArray<string | number> = ['primitives'],
): Array<ReadonlyArray<string | number>> => {
  const paths: Array<ReadonlyArray<string | number>> = [];
  primitives.forEach((primitive, index) => {
    const path = [...prefix, index];
    paths.push(path);
    if (primitive.type === 'group') paths.push(...primitivePaths(primitive.children, [...path, 'children']));
  });

  return paths;
};

it('为 topology 建立 primitive 双射、真实 semantic owner 与稳定 emission identity', () => {
  const ir: IRScene = {
    version: 1,
    type: 'scene',
    children: [
      { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        id: 'scope-a',
        children: [{ type: 'node', id: 'node-b', position: [80, 0], text: 'B' }],
      },
      {
        type: 'path',
        id: 'path-a',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [80, 0] },
        ],
      },
    ],
  };
  const session = new SceneReconciler({ onWarn: () => {} }, { captureProvenance: true });

  session.mount(ir);
  const snapshot = snapshotOf(session.read());
  const topologyIdentityKeys = snapshot.topology.map(node => identityKey(node.identity));
  const topologyByPath = new Map(snapshot.topology.map(node => [node.primitivePath.join('.'), node]));
  const topologyPaths = snapshot.topology.map(node => node.primitivePath.join('.')).sort();
  const expectedPaths = primitivePaths(snapshot.scene.primitives)
    .map(path => path.join('.'))
    .sort();
  const semanticOwnerPaths = new Set(snapshot.topology.map(node => node.semanticOwner.path.join('/')));

  expect(new Set(topologyIdentityKeys).size).toBe(topologyIdentityKeys.length);
  expect(topologyPaths).toEqual(expectedPaths);
  expect(semanticOwnerPaths).toContain('root/node/node-a');
  expect(semanticOwnerPaths).toContain('root/scope/scope-a');
  expect(semanticOwnerPaths).toContain('root/scope/scope-a/node/node-b');
  expect(semanticOwnerPaths).toContain('root/path/path-a');

  for (const node of snapshot.topology) {
    expect(node.identity.path.slice(0, node.semanticOwner.path.length)).toEqual(node.semanticOwner.path);
    expect(node.identity.path[node.semanticOwner.path.length]).toBe('emission');

    const parentPath = node.primitivePath.slice(0, -2).join('.');
    const parentNode = topologyByPath.get(parentPath);
    let expectedParent = snapshot.root;
    if (node.primitivePath.length > 2 && parentNode === undefined) {
      throw new Error(`missing topology parent at ${parentPath}`);
    }

    if (node.primitivePath.length > 2 && parentNode !== undefined) expectedParent = parentNode.identity;

    expect(identityKey(node.parent)).toBe(identityKey(expectedParent));
    expect(node.order).toBe(node.primitivePath.at(-1));
  }
});

/** 从本次已捕获的编译来源生成渲染快照，计算会话不默认持有此投影 */
const snapshotOf = (result: ReconcilerResult) =>
  createFullSceneRuntimeSnapshot(result.compilation.result.scene, result.revision, result.compilation.provenance!);
