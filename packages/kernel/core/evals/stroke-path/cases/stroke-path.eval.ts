import type { input } from 'zod';

import type { StrokePathSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** StrokePathSchema 的完整输入任务 */
export const cases: Array<CoreEvalCase<input<typeof StrokePathSchema>>> = [
  {
    id: 'K001',
    mustOmit: ['kindOptions'],
    task: '内置描边路径需要一个空步骤序列，省略提供者名。',
    expected: {
      type: 'path',
      children: [],
    },
  },
  {
    id: 'K002',
    task: '显式选择内置 stroke，先移动到 (1,2)，再连到 (4,5)。',
    expected: {
      type: 'path',
      kind: 'stroke',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [1, 2],
        },
        {
          type: 'step',
          kind: 'line',
          to: [4, 5],
        },
      ],
    },
  },
  {
    id: 'K003',
    task: '内置描边从 (0,0) 直线到 (2,0)，只在一端加 open 箭头，不写提供者名。箭头放在起点。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [2, 0] },
      ],
      arrow: { start: { shape: 'open' } },
    },
    contrastId: 'K004',
  },
  {
    id: 'K004',
    task: '内置描边从 (0,0) 直线到 (2,0)，只在一端加 open 箭头，不写提供者名。箭头放在终点。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [2, 0] },
      ],
      arrow: { end: { shape: 'open' } },
    },
    contrastId: 'K003',
  },
];
