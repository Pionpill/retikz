import type { IRCoordinate, IRPathBase, IRScene } from '@retikz/core';

import { defineCacheScenario } from './_scenario';
import type { CacheScenario } from './_scenario';

/** 带圆角、标签和 mark 的短路径，用于观察不同局部槽位 */
const createPath = (): IRPathBase => ({
  type: 'path',
  id: 'line',
  cornerRadius: 10,
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [80, 0] },
    { type: 'step', kind: 'line', to: [80, 40] },
  ],
  label: [{ text: 'label', position: 0.5 }],
  marks: [{ shape: 'star', pos: 0.2 }],
});

for (const identity of ['same', 'shallow', 'nested'] as const)
  defineCacheScenario((): CacheScenario => {
    const path = createPath();
    const next = identity === 'same' ? path : identity === 'shallow' ? { ...path } : structuredClone(path);
    const scene: IRScene = { type: 'scene', version: 1, children: [path] };
    return {
      domain: 'path',
      label: `等值输入/${identity}`,
      scene,
      steps: [
        {
          label: '提交等值路径',
          update: next,
          scene: { ...scene, children: [next] },
        },
      ],
    };
  });

defineCacheScenario((): CacheScenario => {
  const path = createPath();
  const moved: IRPathBase = { ...path, marks: [{ shape: 'star', pos: 0.8 }] };
  const rounded: IRPathBase = { ...moved, cornerRadius: 18 };
  const painted: IRPathBase = { ...rounded, style: { stroke: 'blue' } };
  const scene: IRScene = { type: 'scene', version: 1, children: [path] };
  return {
    domain: 'path',
    label: 'mark圆角样式连续变化',
    scene,
    steps: [
      {
        label: 'mark移动',
        update: moved,
        scene: { ...scene, children: [moved] },
      },
      {
        label: '圆角半径变化',
        update: rounded,
        scene: { ...scene, children: [rounded] },
      },
      {
        label: '只改描边颜色',
        update: painted,
        scene: { ...scene, children: [painted] },
      },
    ],
  };
});

defineCacheScenario((): CacheScenario => {
  const path: IRPathBase = {
    type: 'path',
    id: 'line',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [100, 0] },
    ],
  };
  const explicit: IRPathBase = { ...path, kind: 'stroke' };
  const scene: IRScene = { type: 'scene', version: 1, children: [path] };
  return {
    domain: 'path',
    label: '省略与显式默认种类',
    scene,
    steps: [
      {
        label: '显式stroke',
        update: explicit,
        scene: { ...scene, children: [explicit] },
      },
    ],
  };
});

defineCacheScenario((): CacheScenario => {
  const endpoint: IRCoordinate = { type: 'coordinate', id: 'endpoint', position: [100, 0] };
  const path: IRPathBase = {
    type: 'path',
    id: 'line',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: { id: 'endpoint' } },
    ],
    marks: [{ shape: 'star', pos: 0.2 }],
  };
  const next: IRPathBase = { ...path, marks: [{ shape: 'star', pos: 0.8 }] };
  const moved: IRCoordinate = { ...endpoint, position: [200, 50] };
  const scene: IRScene = { type: 'scene', version: 1, children: [endpoint, path] };
  return {
    domain: 'path',
    label: '局部复用后依赖仍有效',
    scene,
    steps: [
      {
        label: '先移动mark',
        update: next,
        scene: { ...scene, children: [endpoint, next] },
      },
      {
        label: '再移动引用坐标',
        update: moved,
        scene: { ...scene, children: [moved, next] },
      },
    ],
  };
});
