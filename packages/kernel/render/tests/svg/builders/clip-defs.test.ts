import type { ClipResource } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { buildClipDef } from '../../../src/svg/builders/clip-defs';

describe('buildClipDef', () => {
  it('把 compound 子形状累积为一个遵循 fillRule 的 path', () => {
    const resource: ClipResource = {
      kind: 'clip',
      id: 'clip-1',
      shape: {
        kind: 'compound',
        fillRule: 'evenodd',
        children: [
          { kind: 'circle', cx: -5, cy: 0, r: 10 },
          { kind: 'circle', cx: 5, cy: 0, r: 10 },
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
});
