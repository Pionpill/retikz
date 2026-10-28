import { describe, expect, it } from 'vitest';

import { NodeSchema } from '../../src/schemas';

describe('Node 布局宽度 schema', () => {
  it('通过 JSON 往返保留正的精确可见宽度', () => {
    const parsed = NodeSchema.parse({ type: 'node', position: [0, 0], layout: { width: 80 } });

    expect(parsed.layout?.width).toBe(80);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('拒绝非正或非有限宽度：%p', width => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], layout: { width } }).success).toBe(false);
  });
});
