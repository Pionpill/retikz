import { describe, expect, it } from 'vitest';

import { PlotDataExecutionSchema } from '../../src';

describe('Plot 数据执行策略', () => {
  it.each([
    {},
    { mode: 'hybrid', external: 'sql' },
    { root: { mode: 'hybrid', external: 'sql' }, marks: { mode: 'builtin' } },
    { root: {}, marks: {} },
  ])('保留统一或独立作用域的稀疏配置 %j', input => {
    expect(PlotDataExecutionSchema.parse(input)).toEqual(input);
  });

  it.each([
    { root: {} },
    { marks: {} },
    { root: {}, marks: {}, mode: 'builtin' },
    { root: { marks: {} }, marks: {} },
    { root: {}, marks: { external: '' } },
  ])('拒绝不完整、混合或无效配置 %j', input => {
    expect(PlotDataExecutionSchema.safeParse(input).success).toBe(false);
  });
});
