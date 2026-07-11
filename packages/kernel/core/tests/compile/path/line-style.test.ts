import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { findPathPrim } from './helpers';

describe('lineCap / lineJoin', () => {
  it('lineCap 透传到 PathPrim.strokeLinecap', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          lineCap: 'round',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeLinecap).toBe('round');
  });

  it('lineJoin 透传到 PathPrim.strokeLinejoin', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          lineJoin: 'bevel',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeLinejoin).toBe('bevel');
  });

  it('未指定时 PathPrim 字段为 undefined（不写 SVG 默认值）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p.strokeLinecap).toBeUndefined();
    expect(p.strokeLinejoin).toBeUndefined();
  });
});
