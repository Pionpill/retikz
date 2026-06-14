import { describe, expect, it } from 'vitest';
import type { Scene } from '@retikz/core';
import { CHECKERS } from '../../src/assert/checkers';

const scene = {
  primitives: [
    { type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#f00', dashPattern: [4, 2] },
    { type: 'rect', x: 20, y: 0, width: 10, height: 10 },
    {
      type: 'text',
      x: 0,
      y: 0,
      lines: [{ text: 'Hello' }],
      fontSize: 12,
      align: 'middle',
      baseline: 'middle',
      lineHeight: 14,
      measuredWidth: 0,
      measuredHeight: 0,
    },
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
      ],
      arrowEnd: { shape: 'stealth' },
    },
  ],
  layout: { x: 0, y: 0, width: 30, height: 10 },
} as unknown as Scene;

describe('CHECKERS.textPresent', () => {
  it('contains 命中', () => {
    expect(CHECKERS.textPresent(scene, { kind: 'textPresent', text: 'Hell' }).pass).toBe(true);
  });
  it('exact 不命中子串', () => {
    expect(
      CHECKERS.textPresent(scene, { kind: 'textPresent', text: 'Hell', match: 'exact' }).pass,
    ).toBe(false);
  });
});

describe('CHECKERS.primitiveCount', () => {
  it('rect >= 2 通过', () => {
    expect(
      CHECKERS.primitiveCount(scene, { kind: 'primitiveCount', primitive: 'rect', op: '>=', value: 2 })
        .pass,
    ).toBe(true);
  });
  it('rect == 3 失败', () => {
    const r = CHECKERS.primitiveCount(scene, {
      kind: 'primitiveCount',
      primitive: 'rect',
      op: '==',
      value: 3,
    });
    expect(r.pass).toBe(false);
    expect(r.actual).toContain('2');
  });
});

describe('CHECKERS.arrowCount', () => {
  it('带箭头 path 计数 >= 1', () => {
    expect(CHECKERS.arrowCount(scene, { kind: 'arrowCount', op: '>=', value: 1 }).pass).toBe(true);
  });
});

describe('CHECKERS.stylePresent', () => {
  it('dashed 命中', () => {
    expect(CHECKERS.stylePresent(scene, { kind: 'stylePresent', style: 'dashed' }).pass).toBe(true);
  });
  it('fill 命中', () => {
    expect(CHECKERS.stylePresent(scene, { kind: 'stylePresent', style: 'fill' }).pass).toBe(true);
  });
});
