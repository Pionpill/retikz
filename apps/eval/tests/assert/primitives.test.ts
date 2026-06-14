import { describe, expect, it } from 'vitest';
import type { Scene } from '@retikz/core';
import { allText, flattenPrimitives } from '../../src/assert/primitives';

const scene = {
  primitives: [
    { type: 'rect', x: 0, y: 0, width: 10, height: 10 },
    {
      type: 'group',
      children: [
        { type: 'ellipse', cx: 5, cy: 5, rx: 3, ry: 3 },
        {
          type: 'text',
          x: 0,
          y: 0,
          lines: [{ text: 'Hi' }, { text: 'there' }],
          fontSize: 12,
          align: 'middle',
          baseline: 'middle',
          lineHeight: 14,
          measuredWidth: 0,
          measuredHeight: 0,
        },
      ],
    },
  ],
  layout: { x: 0, y: 0, width: 10, height: 10 },
} as unknown as Scene;

describe('flattenPrimitives', () => {
  it('递归下钻 group 收齐全部原语', () => {
    const types = flattenPrimitives(scene)
      .map((p) => p.type)
      .sort();
    expect(types).toEqual(['ellipse', 'group', 'rect', 'text']);
  });
});

describe('allText', () => {
  it('收集所有 text 原语的全部行', () => {
    expect(allText(scene)).toEqual(['Hi', 'there']);
  });
});
