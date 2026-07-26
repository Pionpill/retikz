import { describe, expect, it } from 'vitest';

import { AxisLineStepSchema, AxisLineTargetSchema, StepSchema } from '../../../src/schemas';

describe('axis-line step schema', () => {
  it.each(['horizontal', 'vertical'] as const)('接受必填 axis=%s 与收窄 target', axis => {
    expect(
      AxisLineStepSchema.parse({
        type: 'step',
        kind: 'axis-line',
        axis,
        to: { id: 'target', anchor: 'center' },
      }),
    ).toEqual({
      type: 'step',
      kind: 'axis-line',
      axis,
      to: { id: 'target', anchor: 'center' },
    });
  });

  it('拒绝缺失 / 未知 axis 与未知字段', () => {
    expect(AxisLineStepSchema.safeParse({ type: 'step', kind: 'axis-line', to: [10, 20] }).success).toBe(false);
    expect(
      AxisLineStepSchema.safeParse({
        type: 'step',
        kind: 'axis-line',
        axis: 'diagonal',
        to: [10, 20],
      }).success,
    ).toBe(false);
    expect(
      AxisLineStepSchema.safeParse({
        type: 'step',
        kind: 'axis-line',
        axis: 'horizontal',
        to: [10, 20],
        unknown: true,
      }).success,
    ).toBe(false);
  });

  it('target 只接受 Cartesian position 与 NodeTarget', () => {
    expect(AxisLineTargetSchema.safeParse([10, 20]).success).toBe(true);
    expect(AxisLineTargetSchema.safeParse({ id: 'target', offset: [2, -3] }).success).toBe(true);

    const rejected = [
      { angle: 30, radius: 10 },
      { relative: [10, 0] },
      { relativeAccumulate: [10, 0] },
      { offset: [10, 0], from: [0, 0] },
      {
        between: [
          [0, 0],
          [10, 0],
        ],
        fraction: 0.5,
      },
    ];
    for (const target of rejected) {
      expect(AxisLineTargetSchema.safeParse(target).success).toBe(false);
    }
  });

  it('StepSchema 总入口保留 axis-line JSON round-trip', () => {
    const step = {
      type: 'step',
      kind: 'axis-line',
      axis: 'vertical',
      to: [10, 20],
      label: { text: 'y' },
    } as const;
    expect(StepSchema.parse(JSON.parse(JSON.stringify(step)))).toEqual(step);
  });
});
