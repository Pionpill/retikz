import type { input } from 'zod';

import type { SceneSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** SceneSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof SceneSchema>>> = [
  {
    id: 'S001',
    task: '创建空场景，自动取景。',
    expected: {
      type: 'scene',
      version: 1,
      children: [],
    },
  },
  {
    id: 'S002',
    task: '场景左上角 (-5,-7)，宽80高60；根选主题 paper 的暗色模式。',
    expected: {
      type: 'scene',
      version: 1,
      children: [],
      viewBox: {
        x: -5,
        y: -7,
        width: 80,
        height: 60,
      },
      theme: {
        name: 'paper',
        mode: 'dark',
      },
    },
  },
  {
    id: 'S003',
    task: '空场景用 200 毫秒将视框从 (0,0,10,10) 动画至 (1,2,8,6)，保留两端关键帧。',
    expected: {
      type: 'scene',
      version: 1,
      children: [],
      animations: [
        {
          property: 'viewBox',
          duration: 200,
          keyframes: [
            {
              at: 0,
              value: [0, 0, 10, 10],
            },
            {
              at: 1,
              value: [1, 2, 8, 6],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'S004',
    task: '场景按顺序放置坐标 A=(1,2)、空作用域 g（内含空作用域 h）、来自 chart 域的 bars 对象，其 values 为 [2,3]。',
    expected: {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'coordinate',
          id: 'A',
          position: [1, 2],
        },
        {
          type: 'scope',
          id: 'g',
          children: [
            {
              type: 'scope',
              id: 'h',
              children: [],
            },
          ],
        },
        {
          namespace: 'chart',
          type: 'bars',
          values: [2, 3],
        },
      ],
    },
  },
  {
    id: 'S005',
    task: '场景中先放标识符为 A、不含文字的节点于 (1,3)，再放一个组，组内是 chart 域的 bar 对象，其 value 为 0。只给第二个顶层子项选深色模式。',
    expected: {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'node',
          id: 'A',
          position: [1, 3],
        },
        {
          type: 'scope',
          theme: {
            mode: 'dark',
          },
          children: [
            {
              namespace: 'chart',
              type: 'bar',
              value: 0,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'S006',
    task: '场景选择 paper 主题的浅色模式。依次放入标识符为 legend 的作用域和标识符为 A 的无文字节点。legend 内含标识符为 B 的无文字节点，只在该组切为暗色，不重写主题名称；外围节点保持继承。',
    expected: {
      type: 'scene',
      version: 1,
      theme: {
        name: 'paper',
        mode: 'light',
      },
      children: [
        {
          type: 'scope',
          id: 'legend',
          theme: {
            mode: 'dark',
          },
          children: [
            {
              type: 'node',
              id: 'B',
            },
          ],
        },
        {
          type: 'node',
          id: 'A',
        },
      ],
    },
  },
  {
    id: 'S007',
    task: '视框初始左上角 (0,0)，宽 40、高 30；仅在根上添加 300 毫秒镜头动画，从这个视框移动到 (5,6,40,30)。镜头内只有标识符为 A 的无文字节点，不动画节点。',
    expected: {
      type: 'scene',
      version: 1,
      viewBox: {
        x: 0,
        y: 0,
        width: 40,
        height: 30,
      },
      animations: [
        {
          property: 'viewBox',
          duration: 300,
          keyframes: [
            {
              at: 0,
              value: [0, 0, 40, 30],
            },
            {
              at: 1,
              value: [5, 6, 40, 30],
            },
          ],
        },
      ],
      children: [
        {
          type: 'node',
          id: 'A',
        },
      ],
    },
  },
  {
    id: 'S008',
    task: '根场景仅含空组 g，使用 paper 主题名。主题设在根，让组继承。',
    expected: {
      type: 'scene',
      version: 1,
      theme: { name: 'paper' },
      children: [{ type: 'scope', id: 'g', children: [] }],
    },
    contrastId: 'S009',
  },
  {
    id: 'S009',
    task: '根场景仅含空组 g，使用 paper 主题名。仅在组内选用该主题，根不指定。',
    expected: {
      type: 'scene',
      version: 1,
      children: [{ type: 'scope', id: 'g', theme: { name: 'paper' }, children: [] }],
    },
    contrastId: 'S008',
  },
];
