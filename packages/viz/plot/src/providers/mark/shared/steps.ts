import type { IRStep } from '@retikz/core';

/** 把若干屏幕点连成 move + line steps（按需尾部加 cycle 闭合）；点数 < 2 返回 null */
export const pointsToSteps = (points: ReadonlyArray<[number, number]>, closed: boolean): Array<IRStep> | null => {
  if (points.length < 2) return null;

  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
  if (closed) steps.push({ type: 'step', kind: 'cycle' });

  return steps;
};
