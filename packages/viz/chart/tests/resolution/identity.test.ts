import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/resolution';

const base = {
  namespace: 'chart',
  type: 'scatter',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
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

  it('presentation item key 不拼接 Chart id，匿名实例不生成 synthetic id', () => {
    const presentation = {
      children: [
        { key: 'badge', content: { kind: 'child', child: { type: 'scope', id: 'badge', children: [] } } },
        { content: { kind: 'plot' } },
        { content: { kind: 'preset', preset: 'title', text: 'Revenue' } },
      ],
    } as const;
    const identified = resolveChartSpec({ ...base, id: 'sales', presentation });
    const anonymous = resolveChartSpec({ ...base, presentation });

    expect(identified.node).toMatchObject({
      type: 'scope',
      id: 'sales',
      children: [
        {
          children: [{ key: 'badge' }, { key: 'chart.plot' }, { key: 'chart.presentation.title' }],
        },
      ],
    });
    expect(anonymous.node).not.toHaveProperty('id');
    expect(JSON.stringify(anonymous.node)).not.toContain('sales');
    expect(anonymous.node).toMatchObject({
      children: [{ key: 'badge' }, { key: 'chart.plot' }, { key: 'chart.presentation.title' }],
    });
  });
});
