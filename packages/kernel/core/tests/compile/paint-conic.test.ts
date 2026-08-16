import { describe, expect, it } from 'vitest';

import type { RectPrim, ScenePrimitive } from '../../src/contract';
import type { IRPaint, IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { flattenPrims } from '../helpers/flatten';

const conicGrad: IRPaint = {
  kind: 'conicGradient',
  center: [0.5, 0.5],
  angle: -90,
  stops: [
    { offset: 0, color: '#ff0' },
    { offset: 0.5, color: '#06c' },
    { offset: 1, color: '#f30' },
  ],
};

const rectsOf = (prims: Array<ScenePrimitive>): Array<RectPrim> =>
  flattenPrims(prims).filter((p): p is RectPrim => p.type === 'rect');

describe('conicGradient IRPaint compile', () => {
  it('node fill becomes resourceRef and keeps the conic spec in resources', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A', fill: conicGrad }],
    };

    const scene = compileToScene(ir).scene;

    expect(rectsOf(scene.primitives)[0].fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: conicGrad }]);
  });
});
