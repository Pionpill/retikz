import { describe, expect, it } from 'vitest';

import { FoldStepSchema, StepSchema } from '../../../src/schemas';

describe('fold step schema', () => {
  it.each(['-|', '|-'] as const)('两段 via=%s 保持原结构且拒绝 fraction', via => {
    const step = { type: 'step', kind: 'fold', via, to: [100, 60] } as const;
    expect(FoldStepSchema.parse(step)).toEqual(step);
    expect(FoldStepSchema.safeParse({ ...step, fraction: 0.3 }).success).toBe(false);
  });

  it.each(['-|-', '|-|'] as const)('三段 via=%s 接受省略或显式 fraction', via => {
    expect(FoldStepSchema.parse({ type: 'step', kind: 'fold', via, to: [100, 60] })).toEqual({
      type: 'step',
      kind: 'fold',
      via,
      to: [100, 60],
    });
    expect(FoldStepSchema.parse({ type: 'step', kind: 'fold', via, fraction: 0.3, to: [100, 60] })).toMatchObject({
      via,
      fraction: 0.3,
    });
  });

  it.each([0, 1])('三段 fraction=%s 边界合法', fraction => {
    expect(FoldStepSchema.safeParse({ type: 'step', kind: 'fold', via: '-|-', fraction, to: [100, 60] }).success).toBe(
      true,
    );
  });

  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])('拒绝非法 fraction=%s', fraction => {
    expect(FoldStepSchema.safeParse({ type: 'step', kind: 'fold', via: '-|-', fraction, to: [100, 60] }).success).toBe(
      false,
    );
  });

  it('保持 strict object 并由 StepSchema 总入口解析', () => {
    const step = { type: 'step', kind: 'fold', via: '|-|', fraction: 0.75, to: { id: 'target' } } as const;
    expect(StepSchema.parse(step)).toEqual(step);
    expect(FoldStepSchema.safeParse({ ...step, unknown: true }).success).toBe(false);
  });
});
