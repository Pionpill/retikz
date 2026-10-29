import type { IRChild } from '@retikz/core';

import { defineInspector } from '../contract';
import { GroupInspectOptionsSchema } from '../schema';
import { labelNode, markerNode, pathStyle } from './geometry';

/** Scene 分组检查器标识 */
export const GROUP_INSPECTOR_KEY = Object.freeze({ namespace: 'inspect', type: 'group' });

/** 绘制实际分组的局部原点与坐标轴 */
export const GROUP_INSPECTOR = defineInspector({
  ...GROUP_INSPECTOR_KEY,
  subject: { kind: 'primitive', type: 'group' },
  optionsSchema: GroupInspectOptionsSchema,
  inspect: (_subject, context) => {
    const children: Array<IRChild> = [];
    const color = context.appearance.scopeColor;
    if (context.options.origin) children.push(markerNode([0, 0], color));
    if (context.options.axes)
      children.push({
        type: 'path',
        style: pathStyle(color),
        children: [
          { type: 'step', kind: 'move', to: [20, 0] },
          { type: 'step', kind: 'line', to: [0, 0] },
          { type: 'step', kind: 'line', to: [0, 20] },
        ],
      });
    if (context.options.labels && context.target.kind === 'primitive')
      children.push(labelNode([6, -12], context.target.path.join('.'), color));
    return children.map(child => ({ coordinateSpace: 'local' as const, child }));
  },
});
