import type { PathCommand } from '../../../contract';
import { shortenEndpointContacts, splitStrokePathAtInterruptions } from './decoration';
import type { StrokeInterruptionInterval, StrokeEndpointPlacements } from './decoration';
import type { StrokePathGeometry } from './geometry';
import type { LoweredStrokeBody, LoweredStrokePathGeometry, StrokePathCompileContext } from './types';

/** Scene 输出边界统一舍入，定位与圆角始终消费未舍入几何 */
const roundStrokeCommand = (command: PathCommand, round: StrokePathCompileContext['round']): PathCommand => {
  const point = (position: [number, number]): [number, number] => [round(position[0]), round(position[1])];
  switch (command.kind) {
    case 'close':
      return command;
    case 'move':
    case 'line':
      return { ...command, to: point(command.to) };
    case 'quad':
      return { ...command, to: point(command.to), control: point(command.control) };
    case 'cubic':
      return {
        ...command,
        to: point(command.to),
        control1: point(command.control1),
        control2: point(command.control2),
      };
    case 'arc':
      return { ...command, center: point(command.center), radius: round(command.radius) };
    case 'ellipseArc':
      return {
        ...command,
        center: point(command.center),
        radiusX: round(command.radiusX),
        radiusY: round(command.radiusY),
      };
  }
};

/** 应用标签断口和箭头接触截取，不读取图元或绘制外观 */
export const lowerStrokeBody = (
  commands: LoweredStrokePathGeometry['commands'],
  metrics: StrokePathGeometry | undefined,
  intervals: Array<StrokeInterruptionInterval>,
  contact: { shrinkStart: number; shrinkEnd: number; hasEndArrow: boolean },
  strokeWidth: number,
  round: StrokePathCompileContext['round'],
): LoweredStrokeBody => {
  const { shrinkStart, shrinkEnd, hasEndArrow } = contact;
  if (metrics === undefined || intervals.length === 0) {
    commands = commands.map(command => roundStrokeCommand(command, round));
    const contacts = shortenEndpointContacts(commands, { shrinkStart, shrinkEnd, strokeWidth, round });
    return { kind: 'continuous', commands, contacts };
  }
  const fragments = splitStrokePathAtInterruptions(metrics, intervals, round, {
    separateTerminalDrawable: hasEndArrow,
  });
  const startFragment = fragments.find(fragment => fragment.hasPathStart);
  const endFragment = fragments.find(fragment => fragment.hasPathEnd);
  let contacts: StrokeEndpointPlacements = {};
  if (startFragment !== undefined && startFragment === endFragment) {
    contacts = shortenEndpointContacts(startFragment.commands, { shrinkStart, shrinkEnd, strokeWidth, round });
  } else {
    if (startFragment !== undefined)
      contacts.start = shortenEndpointContacts(startFragment.commands, {
        shrinkStart,
        shrinkEnd: 0,
        strokeWidth,
        round,
      }).start;
    if (endFragment !== undefined)
      contacts.end = shortenEndpointContacts(endFragment.commands, {
        shrinkStart: 0,
        shrinkEnd,
        strokeWidth,
        round,
      }).end;
  }
  return { kind: 'interrupted', fragments, contacts };
};
