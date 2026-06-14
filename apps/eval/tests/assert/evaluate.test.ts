import { describe, expect, it } from 'vitest';
import type { Scene } from '@retikz/core';
import { evaluateAssertions } from '../../src/assert/evaluate';

const scene = {
  primitives: [
    { type: 'rect', x: 0, y: 0, width: 10, height: 10 },
    {
      type: 'text',
      x: 0,
      y: 0,
      lines: [{ text: 'A' }],
      fontSize: 12,
      align: 'middle',
      baseline: 'middle',
      lineHeight: 14,
      measuredWidth: 0,
      measuredHeight: 0,
    },
  ],
  layout: { x: 0, y: 0, width: 10, height: 10 },
} as unknown as Scene;

describe('evaluateAssertions', () => {
  it('逐条求值并保留 description', () => {
    const results = evaluateAssertions(scene, [
      { kind: 'textPresent', text: 'A', description: '含字母 A' },
      { kind: 'primitiveCount', primitive: 'rect', op: '>=', value: 2 },
    ]);
    expect(results.map((r) => r.pass)).toEqual([true, false]);
    expect(results[0]?.description).toBe('含字母 A');
    expect(results[0]?.kind).toBe('textPresent');
  });
});
