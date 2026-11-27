import type { IRPath, IRScene } from '@retikz/core';

/** 固定视口内的水平线；不同帧保持 ID、布局和元素数量稳定 */
export const pathScene = (count: number, change: 'none' | 'one' | 'all' = 'none'): IRScene => ({
  type: 'scene',
  version: 1,
  viewBox: { x: 0, y: 0, width: 256, height: 256 },
  children: Array.from({ length: count }, (_, i): IRPath => {
    const x = 2 + (i % 16) * 16;
    const y = 4 + Math.floor(i / 16) * 8;
    return {
      type: 'path',
      id: 'p' + i,
      style: { stroke: change === 'all' || (change === 'one' && i === 0) ? '#ff0000' : '#0000ff' },
      children: [
        { type: 'step', kind: 'move', to: [x, y] },
        { type: 'step', kind: 'line', to: [x + 10, y] },
      ],
    };
  }),
});
