import { shortenEndpointContacts, splitStrokePathAtInterruptions } from './decoration';
import type { StrokeInterruptionInterval, StrokeEndpointPlacements } from './decoration';
import type { StrokePathGeometry } from './geometry';
import type { LoweredStrokeBody, LoweredStrokePathGeometry, StrokePathCompileContext } from './types';

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
    if (shrinkStart !== 0 || shrinkEnd !== 0) commands = [...commands];
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
