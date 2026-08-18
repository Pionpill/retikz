import type { ClipResource } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { buildClipDef } from '../../../src/svg/builders/clip-defs';

describe('buildClipDef', () => {
  it('把 canonical clip path 物化为一个遵循 fillRule 的 SVG path', () => {
    const resource: ClipResource = {
      kind: 'clip',
      id: 'clip-1',
      path: {
        fillRule: 'evenodd',
        commands: [
          { kind: 'move', to: [5, 0] },
          { kind: 'arc', center: [-5, 0], radius: 10, startAngle: 0, endAngle: 360 },
          { kind: 'close' },
          { kind: 'move', to: [15, 0] },
          { kind: 'arc', center: [5, 0], radius: 10, startAngle: 0, endAngle: 360 },
          { kind: 'close' },
        ],
      },
    };

    const definition = buildClipDef(resource, 'scene-clip-1');

    expect(definition.children).toEqual([
      {
        tag: 'path',
        attrs: {
          d: 'M 5 0 A 10 10 0 0 1 -15 0 A 10 10 0 0 1 5 0 Z M 15 0 A 10 10 0 0 1 -5 0 A 10 10 0 0 1 15 0 Z',
          'clip-rule': 'evenodd',
        },
      },
    ]);
  });

  it('close 后的 arc 从声明起点建立新子路径', () => {
    const resource: ClipResource = {
      kind: 'clip',
      id: 'clip-1',
      path: {
        fillRule: 'nonzero',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [1, 0] },
          { kind: 'close' },
          { kind: 'arc', center: [5, 5], radius: 2, startAngle: 0, endAngle: 180 },
        ],
      },
    };

    const definition = buildClipDef(resource, 'scene-clip-1');

    expect(definition.children?.[0]).toEqual({
      tag: 'path',
      attrs: {
        d: 'M 0 0 L 1 0 Z M 7 5 A 2 2 0 0 1 3 5',
        'clip-rule': 'nonzero',
      },
    });
  });
});
