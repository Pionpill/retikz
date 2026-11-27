import type { input } from 'zod';

import type { CoordinateSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** CoordinateSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof CoordinateSchema>>> = [
  {
    id: 'C001',
    task: '命名点 P 位于 (-3,0)，不画任何图形。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: [-3, 0],
    },
  },
  {
    id: 'C002',
    task: 'P 位于已知点 A 正下方，中心距离 12。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: {
        of: 'A',
        direction: 'bottom',
        distance: 12,
      },
    },
  },
  {
    id: 'C003',
    task: 'P 以 A 为极点顺时针转 90 度，半径 3，保留极坐标。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: {
        origin: 'A',
        angle: 90,
        radius: 3,
      },
    },
  },
  {
    id: 'C004',
    task: 'P 从 A 的中心向右 3、向上 2，保留位移。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: {
        of: 'A',
        offset: [3, -2],
      },
    },
  },
  {
    id: 'C005',
    task: 'P 在 A 到 B、C 中点的连线上，从 A 走四分之一；保留嵌套插值。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: {
        between: [
          {
            id: 'A',
          },
          {
            between: [
              {
                id: 'B',
              },
              {
                id: 'C',
              },
            ],
            fraction: 0.5,
          },
        ],
        fraction: 0.25,
      },
    },
  },
  {
    id: 'C006',
    task: 'P 用嵌套极坐标表示：从 (2,3) 顺时针 30 度走 4 作为新极点，再顺时针 60 度走 5。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: {
        origin: {
          origin: [2, 3],
          angle: 30,
          radius: 4,
        },
        angle: 60,
        radius: 5,
      },
    },
  },
  {
    id: 'C007',
    task: 'P 用偏移表达放在极坐标点（默认原点，90 度，半径 4）右边 2、下方 3。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: {
        of: {
          angle: 90,
          radius: 4,
        },
        offset: [2, 3],
      },
    },
  },
  {
    id: 'C008',
    task: '命名坐标 P 取两个锚点中点，保留引用。起点是 A 下边四分之一处再向右移 2，终点是 B 的 45 度锚点，使用注册的 ring 连接面，参数 inset 为 3。',
    expected: {
      type: 'coordinate',
      id: 'P',
      position: {
        between: [
          {
            id: 'A',
            anchor: {
              side: 'bottom',
              fraction: 0.25,
            },
            offset: [2, 0],
          },
          {
            id: 'B',
            anchor: 45,
            boundary: {
              type: 'ring',
              params: {
                inset: 3,
              },
            },
          },
        ],
        fraction: 0.5,
      },
    },
  },
  {
    id: 'C009',
    task: '命名点 P 位于 A 右方 8 个单位。保留方向与中心距离，不改写为位移。',
    expected: { type: 'coordinate', id: 'P', position: { direction: 'right', of: 'A', distance: 8 } },
    contrastId: 'C010',
  },
  {
    id: 'C010',
    task: '命名点 P 位于 A 右方 8 个单位。保留以 A 为基点的笛卡尔位移，不用方向定位。',
    expected: { type: 'coordinate', id: 'P', position: { of: 'A', offset: [8, 0] } },
    contrastId: 'C009',
  },
];
