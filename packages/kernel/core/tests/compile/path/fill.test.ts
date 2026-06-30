import { describe, expect, it } from 'vitest';

import type { IR } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { findPathPrim } from './helpers';

describe('compile path: fill / fillRule', () => {
  it('缺省 fill = none（仅描边，向后兼容）', () => {
    const ir: IR = {
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
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.fill).toBe('none');
    expect(path.fillRule).toBeUndefined();
  });

  it('显式 fill 透传到 PathPrim', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: '#3b82f6',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.fill).toBe('#3b82f6');
  });

  it("fillRule 'evenodd' 透传", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: 'red',
          fillRule: 'evenodd',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.fillRule).toBe('evenodd');
  });
});
