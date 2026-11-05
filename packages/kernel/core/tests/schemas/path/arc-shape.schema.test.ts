import { describe, expect, it } from 'vitest';

import { CirclePathStepSchema, EllipsePathStepSchema, StepSchema } from '../../../src/schemas';

describe.each([
  { kind: 'circlePath', radius: 10, schema: CirclePathStepSchema },
  { kind: 'ellipsePath', radius: { x: 12, y: 8 }, schema: EllipsePathStepSchema },
])('$kind 的局部角度约束', ({ kind, radius, schema }) => {
  const base = { type: 'step', kind, radius };

  it('独立与聚合入口均允许整圈和成对角度', () => {
    const partial = { ...base, startAngle: 0, endAngle: 180, closed: 'sector' };
    for (const entry of [schema, StepSchema]) {
      expect(entry.parse(base)).toEqual(base);
      expect(entry.parse(partial)).toEqual(partial);
    }
  });

  it('独立与聚合入口均将缺失角度定位到对应字段', () => {
    for (const entry of [schema, StepSchema]) {
      for (const [angles, missing] of [
        [{ startAngle: 0 }, 'endAngle'],
        [{ endAngle: 180 }, 'startAngle'],
      ] as const) {
        const result = entry.safeParse({ ...base, ...angles });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [missing] }));
      }
    }
  });

  it('角度存在时拒绝整圈闭合模式', () => {
    for (const entry of [schema, StepSchema]) {
      const result = entry.safeParse({ ...base, startAngle: 0, endAngle: 180, closed: 'closed' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ['closed'] }));
    }
  });
});
