import type { IRPosition, PathCommand } from '@retikz/core';

import { segmentsFromCommands } from '../centerline';
import { commandBoundsPoints, reverseCommands } from '../commands';

/** 保留作者两侧曲线，反转下边界并用直线封口 */
export const boundaryOutlineCommands = ({
  upper,
  lower,
}: {
  upper: ReadonlyArray<PathCommand>;
  lower: ReadonlyArray<PathCommand>;
}): { commands: Array<PathCommand>; points: Array<IRPosition> } => {
  segmentsFromCommands({ commands: upper, source: 'upper boundary' });
  segmentsFromCommands({ commands: lower, source: 'lower boundary' });
  const reversed = reverseCommands(lower);
  const first = reversed[0];
  const commands: Array<PathCommand> = [...upper];
  if (first.kind === 'move') commands.push({ kind: 'line', to: first.to });
  commands.push(...reversed.slice(1), { kind: 'close' });
  return { commands, points: commandBoundsPoints(commands) };
};
