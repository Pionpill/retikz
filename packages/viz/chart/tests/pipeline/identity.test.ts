import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/pipeline';

const base = {
  namespace: 'chart',
  type: '__infrastructure-fixture',
  data: { reference: 'rows' },
  encoding: { x: 'amount', y: 'margin' },
} as const;

describe('Chart identity', () => {
  it('从显式 Chart id 确定性派生 Scope 与 Plot id', () => {
    const result = resolveChartSpec({ ...base, id: 'sales' });

    expect(result.plotSpec.id).toBe('sales/plot');
    expect(result.node).toEqual({ type: 'scope', id: 'sales', children: [result.plotSpec] });
  });

  it('匿名 Chart 不生成计数 id', () => {
    const first = resolveChartSpec(base);
    const second = resolveChartSpec(base);

    expect(first.plotSpec.id).toBeUndefined();
    expect(first.node).toEqual(first.plotSpec);
    expect(second.node).toEqual(first.node);
  });
});
