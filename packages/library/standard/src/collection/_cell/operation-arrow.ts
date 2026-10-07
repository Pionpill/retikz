import type { IRPath } from '@retikz/core';
import type { input } from 'zod';

import { OperationArrowSchema } from './schema';

/** 将集合拥有的路径端点下沉为 Core 路径与末端箭头 */
export const createOperationArrow = (
  config: input<typeof OperationArrowSchema>,
  points: Array<[number, number]>,
): IRPath => {
  const options = typeof config === 'object' ? config : {};
  return {
    type: 'path',
    style: OperationArrowSchema.unwrap()
      .options[1].shape.style.unwrap()
      .parse(options.style ?? {}),
    marks: [{ pos: 1, mark: { kind: 'arrow', ...options.arrowDetail } }],
    children: points.map((point, index) => ({ type: 'step', kind: index === 0 ? 'move' : 'line', to: point })),
  };
};

/** 排列方向对应的单位向量 */
export const linearDirectionVector = (direction: 'up' | 'down' | 'left' | 'right'): [number, number] => {
  switch (direction) {
    case 'up':
      return [0, -1];
    case 'down':
      return [0, 1];
    case 'left':
      return [-1, 0];
    case 'right':
      return [1, 0];
  }
};
