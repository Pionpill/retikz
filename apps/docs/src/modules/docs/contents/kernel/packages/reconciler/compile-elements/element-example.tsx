import type { IRScene } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

/** 前向引用一个具名矩形和一个不产生图元的坐标 */
const scene: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'A' } },
        { type: 'step', kind: 'line', to: { id: 'C' } },
      ],
    },
    {
      type: 'node',
      id: 'A',
      text: 'A',
      position: [0, 0],
      layout: { minimumSize: { width: 60, height: 40 }, padding: 0, margin: 0 },
    },
    { type: 'coordinate', id: 'C', position: [180, 0] },
  ],
};

/** 展示同一子树中三类叶子组装后的可见结果 */
const ElementExample: FC = () => <Layout ir={scene} style={{ maxWidth: '100%', height: 'auto' }} />;
export default ElementExample;
