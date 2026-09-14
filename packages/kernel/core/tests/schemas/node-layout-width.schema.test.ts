import { describe, expect, it } from 'vitest';

import { NodeSchema } from '../../src/schemas';

describe('Node layout width schema', () => {
  it('preserves a positive exact visible width through JSON round-trip', () => {
    const parsed = NodeSchema.parse({ type: 'node', position: [0, 0], layout: { width: 80 } });

    expect(parsed.layout?.width).toBe(80);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects non-positive or non-finite width: %p', width => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], layout: { width } }).success).toBe(false);
  });
});
