import { describe, expect, it } from 'vitest';

import { emitNodeOutput, layoutNode, resolveNode } from '../../../../core/src';
import { flattenPrims } from '../../../../core/tests/helpers/flatten';
import { createSharedCompileContext } from '../../../src/compile';

describe('原子编译阶段', () => {
  it('节点解析、布局和输出仅通过显式能力组合，不要求元素工作区', () => {
    const shared = createSharedCompileContext();
    const warnings: Array<string> = [];
    const resolution = resolveNode(
      { type: 'node', id: 'a', position: [12, 24], text: 'A', style: { fill: 'red' } },
      {
        ...shared.registries,
        ...shared.layout,
        scopeDefaults: {},
        mode: 'light',
        irPath: ['children', 0],
        warn: (_code, message) => warnings.push(message),
      },
    );
    const compilation = layoutNode(resolution, {
      measureText: shared.host.measureText,
      positionContext: {
        nodeDistance: 10,
        pointOfNodeTarget: () => [0, 0],
        lookupReference: () => undefined,
        toLocal: point => point,
        toWorld: point => point,
      },
    });
    const output = emitNodeOutput(compilation, {
      round: shared.layout.round,
      registerPaint: paint => {
        if (paint !== undefined && typeof paint !== 'string') throw new Error('expected solid paint');
        return paint;
      },
    });
    expect(compilation.layout.geometry.rect).toMatchObject({ x: 12, y: 24 });
    expect(
      flattenPrims(output.primitives).some(primitive => primitive.type === 'rect' && primitive.fill === 'red'),
    ).toBe(true);
    expect(output.bounds[0].boundsPoints).toHaveLength(4);
    expect(warnings).toEqual([]);
  });
});
