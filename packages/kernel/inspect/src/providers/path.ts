import type { IRChild, IRPosition, PathCommand } from '@retikz/core';

import { defineInspector } from '../contract';
import { PathInspectOptionsSchema } from '../schema';
import { labelNode, markerNode, pathStyle, pointAtArcCommand } from './geometry';

/** 最终 Scene Path 检查器标识 */
export const PATH_INSPECTOR_KEY = Object.freeze({ namespace: 'inspect', type: 'path' });

/** 最终路径控制柄与端点共用普通绘图，不重建作者路径 */
export const PATH_INSPECTOR = defineInspector({
  ...PATH_INSPECTOR_KEY,
  subject: { kind: 'primitive', type: 'path' },
  optionsSchema: PathInspectOptionsSchema,
  inspect: (subject, context) => {
    const children: Array<IRChild> = [];
    const points: Array<IRPosition> = [];
    const color = context.appearance.scopeColor;
    let current: IRPosition | undefined;
    let start: IRPosition | undefined;
    const mark = (position: IRPosition, label: string, visible: boolean): void => {
      if (visible && !points.some(point => point[0] === position[0] && point[1] === position[1])) {
        points.push(position);
        children.push(markerNode(position, color));
      }
      if (context.options.labels) children.push(labelNode([position[0] + 6, position[1] - 12], label, color));
    };
    const handle = (from: IRPosition, to: IRPosition): void => {
      children.push({
        type: 'path',
        style: pathStyle(color, { dashPattern: [4, 3] }),
        children: [
          { type: 'step', kind: 'move', to: from },
          { type: 'step', kind: 'line', to },
        ],
      });
    };
    for (const [index, source] of subject.commands.entries()) {
      const command = source as PathCommand;
      if (command.kind === 'quad' || command.kind === 'cubic') {
        const first = command.kind === 'quad' ? command.control : command.control1;
        const last = command.kind === 'quad' ? command.control : command.control2;
        if (context.options.controlPoints) {
          if (current !== undefined) handle(current, first);
          handle(last, command.to);
        }
        if (context.options.controlPoints || context.options.labels) {
          mark(first, `${command.kind === 'quad' ? 'Q' : 'C'}${index}.1`, context.options.controlPoints);
          if (command.kind === 'cubic') mark(last, `C${index}.2`, context.options.controlPoints);
        }
      }
      if (command.kind === 'move') start = command.to;
      if (command.kind === 'arc' || command.kind === 'ellipseArc') {
        const arcStart = pointAtArcCommand(command, command.startAngle);
        start ??= arcStart;
        if (context.options.vertices) mark(arcStart, `V${index}.start`, true);
        current = pointAtArcCommand(command, command.endAngle);
      } else if (command.kind === 'close') current = start;
      else current = command.to;
      if (context.options.vertices && current !== undefined) mark(current, `V${index}`, true);
    }
    return children.map(child => ({ coordinateSpace: 'local' as const, child }));
  },
});
