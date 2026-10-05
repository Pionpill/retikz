import type { IRPosition, PathCommand } from '@retikz/core';
import { isFinitePoint } from '@retikz/math';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../errors';

/** 命令链末点，圆弧使用其终止角 */
export const commandEndpoint = (command: PathCommand): IRPosition | undefined => {
  if ('to' in command) return command.to;
  if (command.kind === 'arc' || command.kind === 'ellipseArc') {
    const angle = (command.endAngle * Math.PI) / 180;
    const radiusX = command.kind === 'arc' ? command.radius : command.radiusX;
    const radiusY = command.kind === 'arc' ? command.radius : command.radiusY;

    return [command.center[0] + radiusX * Math.cos(angle), command.center[1] + radiusY * Math.sin(angle)];
  }

  return undefined;
};

/** 曲线控制包络包含全部几何极值，不仅包含采样点 */
export const commandBoundsPoints = (commands: ReadonlyArray<PathCommand>): Array<IRPosition> => {
  const points: Array<IRPosition> = [];

  for (const command of commands) {
    if ('to' in command) points.push(command.to);
    if (command.kind === 'quad') points.push(command.control);
    if (command.kind === 'cubic') points.push(command.control1, command.control2);
    if (command.kind === 'arc' || command.kind === 'ellipseArc') {
      const x = command.kind === 'arc' ? command.radius : command.radiusX;
      const y = command.kind === 'arc' ? command.radius : command.radiusY;
      if (!Number.isFinite(command.startAngle) || !Number.isFinite(command.endAngle) || x <= 0 || y <= 0)
        throw new RetikzExtensionError({
          code: RetikzExtensionErrorCode.GeometryInvalid,
          message: 'Ribbon arc geometry is invalid.',
          details: {},
        });

      points.push([command.center[0] - x, command.center[1] - y], [command.center[0] + x, command.center[1] + y]);
    }
  }

  if (points.some(point => !isFinitePoint(point)))
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: 'Ribbon geometry contains non-finite coordinates.',
      details: {},
    });

  return points;
};

/** 反转单条开放命令链，保留曲线阶数和几何 */
export const reverseCommands = (commands: ReadonlyArray<PathCommand>): Array<PathCommand> => {
  let cursor: IRPosition | undefined;
  const reversed: Array<PathCommand> = [];

  for (const command of commands) {
    if (command.kind === 'move') {
      cursor = command.to;
      continue;
    }

    if (cursor === undefined || command.kind === 'close')
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.GeometryInvalid,
        message: 'Ribbon requires a single open path.',
        details: {},
      });

    if (command.kind === 'line') reversed.push({ kind: 'line', to: cursor });
    else if (command.kind === 'quad') reversed.push({ ...command, to: cursor });
    else if (command.kind === 'cubic')
      reversed.push({ kind: 'cubic', control1: command.control2, control2: command.control1, to: cursor });
    else reversed.push({ ...command, startAngle: command.endAngle, endAngle: command.startAngle });

    cursor = commandEndpoint(command);
  }

  return cursor === undefined ? [] : [{ kind: 'move', to: cursor }, ...reversed.reverse()];
};
