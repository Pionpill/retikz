import { describe, expect, it } from 'vitest';

import type { IR } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { ellipseArc, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'ellipsePath'", () => {
  it('ellipsePath rx=15 / ry=10 → 两段半弧', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'ellipsePath', radiusX: 15, radiusY: 10 },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([15, 0]),
      ellipseArc([0, 0], 15, 10, 0, 360),
    ]);
  });

  it('ellipse rx == ry 时与 circle 等价输出', () => {
    const fromEllipse: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'ellipsePath', radiusX: 7, radiusY: 7 },
          ],
        },
      ],
    };
    const fromCircle: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 7 },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(fromEllipse).primitives).commands).toEqual(
      findPathPrim(compileToScene(fromCircle).primitives).commands,
    );
  });
});
