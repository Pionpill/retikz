import type { IRCoordinate, IRNode, IRScene } from '@retikz/core';

import { defineCacheScenario } from './_scenario';
import type { CacheScenario } from './_scenario';

/** 坐标本身不绘制，用真实消费者把位置变化变为可校验的 Scene 几何 */
const consumer: IRNode = {
  type: 'node',
  id: 'consumer',
  text: 'point',
  position: { of: 'point', direction: 'right', distance: 0 },
};

for (const identity of ['same', 'shallow', 'nested'] as const)
  defineCacheScenario((): CacheScenario => {
    const point: IRCoordinate = { type: 'coordinate', id: 'point', position: [10, 20] };
    const next = identity === 'same' ? point : identity === 'shallow' ? { ...point } : structuredClone(point);
    const scene: IRScene = { type: 'scene', version: 1, children: [point, consumer] };
    return {
      domain: 'coordinate',
      label: `等值输入/${identity}`,
      scene,
      steps: [
        {
          label: '提交等值坐标',
          update: next,
          scene: { ...scene, children: [next, consumer] },
        },
      ],
    };
  });

defineCacheScenario((): CacheScenario => {
  const origin: IRCoordinate = { type: 'coordinate', id: 'origin', position: [0, 0] };
  const point: IRCoordinate = { type: 'coordinate', id: 'point', position: { of: 'origin', direction: 'right' } };
  const explicit: IRCoordinate = { ...point, position: { of: 'origin', direction: 'right', distance: 24 } };
  const moved: IRCoordinate = { ...origin, position: [50, 20] };
  const scene: IRScene = { type: 'scene', version: 1, children: [origin, point, consumer] };
  return {
    domain: 'coordinate',
    label: '显式默认值后引用目标移动',
    scene,
    steps: [
      {
        label: '补齐默认距离',
        update: explicit,
        scene: { ...scene, children: [origin, explicit, consumer] },
      },
      {
        label: '移动被引用坐标',
        update: moved,
        scene: { ...scene, children: [moved, explicit, consumer] },
      },
      {
        label: '恢复被引用坐标',
        update: origin,
        scene: { ...scene, children: [origin, explicit, consumer] },
      },
    ],
  };
});

defineCacheScenario((): CacheScenario => {
  const point: IRCoordinate = { type: 'coordinate', id: 'point', position: [10, 20] };
  const moved: IRCoordinate = { ...point, position: [30, 40] };
  const scene: IRScene = { type: 'scene', version: 1, children: [point, consumer] };
  return {
    domain: 'coordinate',
    label: '位置真实变化',
    scene,
    steps: [
      {
        label: '移动坐标',
        update: moved,
        scene: { ...scene, children: [moved, consumer] },
      },
    ],
  };
});
