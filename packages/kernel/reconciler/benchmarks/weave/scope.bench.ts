import type { IRCoordinate, IRNode, IRScene, IRScope } from '@retikz/core';

import { defineCacheScenario } from './_scenario';
import type { CacheScenario } from './_scenario';

for (const identity of ['same', 'shallow', 'nested'] as const)
  defineCacheScenario((): CacheScenario => {
    const scope: IRScope = {
      type: 'scope',
      id: 'box',
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      children: [{ type: 'node', id: 'body', text: 'body' }],
    };
    const { children, ...own } = scope;
    const next = identity === 'same' ? own : identity === 'shallow' ? { ...own } : structuredClone(own);
    const scene: IRScene = { type: 'scene', version: 1, children: [scope] };
    return {
      domain: 'scope',
      label: `等值输入/${identity}`,
      scene,
      steps: [
        {
          label: '提交等值容器',
          update: next,
          scene: { ...scene, children: [{ ...next, children }] },
        },
      ],
    };
  });

defineCacheScenario((): CacheScenario => {
  const origin: IRCoordinate = { type: 'coordinate', id: 'origin', position: [10, 20] };
  const scope: IRScope = {
    type: 'scope',
    id: 'box',
    transforms: [{ kind: 'offset-translate', of: 'origin' }],
    children: [{ type: 'node', text: 'body' }],
  };
  const explicit: IRScope = { ...scope, transforms: [{ kind: 'offset-translate', of: 'origin', offset: [0, 0] }] };
  const moved: IRCoordinate = { ...origin, position: [40, 50] };
  const scene: IRScene = { type: 'scene', version: 1, children: [origin, scope] };
  return {
    domain: 'scope',
    label: '默认变换与外部引用',
    scene,
    steps: [
      {
        label: '补齐默认offset',
        update: explicit,
        scene: { ...scene, children: [origin, explicit] },
      },
      {
        label: '移动外部引用坐标',
        update: moved,
        scene: { ...scene, children: [moved, explicit] },
      },
    ],
  };
});

defineCacheScenario((): CacheScenario => {
  const node: IRNode = { type: 'node', id: 'body', text: 'body', position: [0, 0] };
  const scope: IRScope = { type: 'scope', id: 'box', children: [node] };
  const moved: IRNode = { ...node, position: [50, 20] };
  const scene: IRScene = { type: 'scene', version: 1, children: [scope] };
  return {
    domain: 'scope',
    label: '子布局变化',
    scene,
    steps: [
      {
        label: '移动后代节点',
        update: moved,
        parentPath: [0],
        scene: { ...scene, children: [{ ...scope, children: [moved] }] },
      },
    ],
  };
});
