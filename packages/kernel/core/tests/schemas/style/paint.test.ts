import { describe, expect, it } from 'vitest';

import { PaintSchema } from '../../../src/schemas';

describe('PaintSchema — 图案', () => {
  it('稀疏线型周期接受首尾不同槽位并保留显式 false', () => {
    const input = {
      kind: 'pattern' as const,
      shape: 'grid',
      lineStyleCycle: {
        period: 4,
        overrides: [
          { index: 0, style: { lineWidth: 3 } },
          { index: 3, style: { dashed: false, dotted: false } },
        ],
      },
    };

    const parsed = PaintSchema.parse(input);

    expect(parsed).toEqual(input);
  });
});

describe('外部图案输入的线型约束', () => {
  it.each([
    ['越界 index', { period: 3, overrides: [{ index: 3, style: {} }] }],
    [
      '重复 index',
      {
        period: 3,
        overrides: [
          { index: 1, style: {} },
          { index: 1, style: { dashed: true } },
        ],
      },
    ],
  ])('拒绝非法 lineStyleCycle override：%s', (_label, lineStyleCycle) => {
    const result = PaintSchema.safeParse({ kind: 'pattern', shape: 'lines', lineStyleCycle });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          issue =>
            issue.path[0] === 'lineStyleCycle' &&
            issue.path[1] === 'overrides' &&
            typeof issue.path[2] === 'number' &&
            issue.path[3] === 'index',
        ),
      ).toBe(true);
    }
  });
});
