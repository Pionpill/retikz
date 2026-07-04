import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { findPathPrim } from './helpers';

describe('alpha.3 P2：path 级 opacity / fillOpacity / drawOpacity', () => {
  it('opacity 透传到 PathPrim.opacity', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          opacity: 0.5,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).opacity).toBe(0.5);
  });

  it('fillOpacity 透传', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: 'red',
          fillOpacity: 0.3,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).fillOpacity).toBe(0.3);
  });

  it('IR drawOpacity → PathPrim.strokeOpacity（命名映射，与 Node 一致）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          drawOpacity: 0.7,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeOpacity).toBe(0.7);
  });

  it('未指定时三个 opacity 字段都是 undefined', () => {
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
    expect(p.opacity).toBeUndefined();
    expect(p.fillOpacity).toBeUndefined();
    expect(p.strokeOpacity).toBeUndefined();
  });
});
