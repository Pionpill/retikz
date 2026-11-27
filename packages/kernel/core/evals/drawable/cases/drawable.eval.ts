import type { input } from 'zod';

import type { DrawableInstanceSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** DrawableInstanceSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof DrawableInstanceSchema>>> = [
  {
    id: 'D001',
    task: '仅设置可绘制实例的稳定名称 D 和绘制层级 -3。',
    expected: {
      id: 'D',
      zIndex: -3,
    },
  },
  {
    id: 'D002',
    task: '保留元数据 tags 为 [null,false]，实例透明度在 100 毫秒内从 0 变为 1。',
    expected: {
      meta: {
        tags: [null, false],
      },
      animations: [
        {
          property: 'opacity',
          duration: 100,
          keyframes: [
            {
              at: 0,
              value: 0,
            },
            {
              at: 1,
              value: 1,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'D003',
    task: '标识符为 host 的可绘制实例在收到 pulse 事件后用 240 毫秒绕元素局部点 (2,4) 从 0 度转到 90 度。元数据另保留字符串 event 为 pulse，不能用元数据代替动画触发器。',
    expected: {
      id: 'host',
      meta: {
        event: 'pulse',
      },
      animations: [
        {
          property: 'rotate',
          duration: 240,
          origin: [2, 4],
          trigger: {
            onEvent: 'pulse',
          },
          keyframes: [
            {
              at: 0,
              value: 0,
            },
            {
              at: 1,
              value: 90,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'D004',
    task: '为实例配置 200 毫秒的透明度动画，从 0 到 1。只改变整体透明度。',
    expected: {
      animations: [
        {
          property: 'opacity',
          duration: 200,
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
        },
      ],
    },
    contrastId: 'D005',
  },
  {
    id: 'D005',
    task: '为实例配置 200 毫秒的透明度动画，从 0 到 1。只改变描边透明度。',
    expected: {
      animations: [
        {
          property: 'strokeOpacity',
          duration: 200,
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
        },
      ],
    },
    contrastId: 'D004',
  },
];
