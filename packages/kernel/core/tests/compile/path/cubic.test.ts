import { describe, expect, it } from 'vitest';

import type { IR } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { close, cubic, line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'cubic'", () => {
  it('cubic 直接坐标 → M ... C c1x c1y c2x c2y x y', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', to: [10, 0], control1: [3, 5], control2: [7, 5] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([3, 5], [7, 5], [10, 0]),
    ]);
  });

  it('cubic 与 line 混用', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', to: [10, 0], control1: [2, 5], control2: [8, 5] },
            { type: 'step', kind: 'line', to: [20, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([2, 5], [8, 5], [10, 0]),
      line([20, 0]),
    ]);
  });

  it('cubic + cycle', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', to: [10, 10], control1: [5, 0], control2: [10, 5] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([5, 0], [10, 5], [10, 10]),
      close(),
    ]);
  });
});
