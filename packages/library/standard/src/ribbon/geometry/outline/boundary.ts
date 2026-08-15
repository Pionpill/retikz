import type { IRPosition, PathCommand } from '@retikz/core';

import { isFinitePoint } from '@retikz/math';

import type { RibbonSegment } from '../types';

import { sampleAtDistance } from '../centerline';

export type BoundaryOutlineCommandsInput = {
  upper: ReadonlyArray<RibbonSegment>;
  upperLength: number;
  lower: ReadonlyArray<RibbonSegment>;
  lowerLength: number;
  sampleCount: number;
  round: (n: number) => number;
};

/**
 * boundary 模式 ribbon 轮廓
 * @description upper / lower 已各自解析成中心线段；这里按同一归一化 offset 采样两条边界，再拼成闭合 path
 */
export const boundaryOutlineCommands = ({
  upper,
  upperLength,
  lower,
  lowerLength,
  sampleCount,
  round,
}: BoundaryOutlineCommandsInput): { commands: Array<PathCommand>; points: Array<IRPosition> } => {
  const upperPoints: Array<IRPosition> = [];
  const lowerPoints: Array<IRPosition> = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const offset = i / (sampleCount - 1);
    const upperPoint = sampleAtDistance(upper, upperLength, offset * upperLength).point;
    const lowerPoint = sampleAtDistance(lower, lowerLength, offset * lowerLength).point;
    const u: IRPosition = [round(upperPoint[0]), round(upperPoint[1])];
    const l: IRPosition = [round(lowerPoint[0]), round(lowerPoint[1])];
    if (!isFinitePoint(u) || !isFinitePoint(l)) {
      throw new Error('Ribbon boundary sampling produced a non-finite coordinate.');
    }
    upperPoints.push(u);
    lowerPoints.push(l);
  }
  const commands: Array<PathCommand> = [{ kind: 'move', to: upperPoints[0] }];
  for (let i = 1; i < upperPoints.length; i += 1) {
    commands.push({ kind: 'line', to: upperPoints[i] });
  }
  for (let i = lowerPoints.length - 1; i >= 0; i -= 1) {
    commands.push({ kind: 'line', to: lowerPoints[i] });
  }
  commands.push({ kind: 'close' });
  return { commands, points: [...upperPoints, ...lowerPoints] };
};
