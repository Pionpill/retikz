import type { IR } from '@retikz/core';
import { Tikz } from '@retikz/react';
import type { FC } from 'react';

// 已存好的 IR JSON——来自 LLM 生成 / JSON 编辑器 / URL 反序列化 / 数据库存档，不写 JSX children 照样能渲染。
const ir: IR = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0], text: 'A' },
    { type: 'node', id: 'b', position: [120, 0], text: 'B' },
    { type: 'node', id: 'c', position: [60, 60], text: 'C' },
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: 'a' },
        { type: 'step', kind: 'line', to: 'b' },
        { type: 'step', kind: 'line', to: 'c' },
        { type: 'step', kind: 'line', to: 'a' },
      ],
    },
  ],
};

const Demo: FC = () => <Tikz ir={ir} width={300} height={120} />;

export default Demo;
