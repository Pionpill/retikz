import { describe, expect, it } from 'vitest';

import { emitNodeOutput, compileNode, layoutNode, resolveNode, LayoutAxisProposalKind } from '../../../../core/src';
import { flattenPrims } from '../../../../core/tests/helpers/flatten';
import { createSharedCompileContext } from '../../../src/compile';

describe('原子编译阶段', () => {
  it('同一解析结果可用于不同宽度布局，公式解析诊断不随布局重试重复', () => {
    const shared = createSharedCompileContext({ fontSize: 20 });
    const warnings: Array<string> = [];
    const resolution = resolveNode(
      { type: 'node', text: 'one two $unfinished', label: { text: 'label $unfinished' } },
      {
        ...shared.registries,
        ...shared.layout,
        scopeDefaults: {},
        mode: 'light',
        gatingOn: true,
        irPath: [],
        warn: code => warnings.push(code),
      },
    );
    expect(warnings).toEqual(['TEXT_TEX_PARSE_ERROR', 'TEXT_TEX_PARSE_ERROR']);
    const before = JSON.stringify(resolution);
    const layouts = [80, 500].map(
      value =>
        layoutNode(resolution, {
          measureText: (text, font) => ({ width: (text.length * font.size) / 2, height: font.size }),
          positionContext: {
            nodeDistance: 10,
            pointOfNodeTarget: () => [0, 0],
            lookupReference: () => undefined,
            toLocal: point => point,
            toWorld: point => point,
          },
          allocationWidthProposal: { kind: LayoutAxisProposalKind.Exact, value },
        }).context,
    );
    expect(layouts[0].geometry.contentSize.height).toBeGreaterThan(layouts[1].geometry.contentSize.height);
    expect(JSON.stringify(resolution)).toBe(before);
    expect(warnings).toHaveLength(2);
  });

  it('节点解析、布局和输出仅通过显式能力组合，不要求元素工作区', () => {
    const shared = createSharedCompileContext();
    const warnings: Array<string> = [];
    const resolution = resolveNode(
      { type: 'node', id: 'a', position: [12, 24], text: 'A', style: { fill: 'red' } },
      {
        ...shared.registries,
        ...shared.layout,
        gatingOn: shared.host.lowerTex !== undefined,
        scopeDefaults: {},
        mode: 'light',
        irPath: ['children', 0],
        warn: (_code, message) => warnings.push(message),
      },
    );
    const compilation = compileNode(resolution, {
      round: shared.layout.round,
      registerPaint: paint => {
        if (paint !== undefined && typeof paint !== 'string') throw new Error('expected solid paint');
        return paint;
      },
      measureText: shared.host.measureText,
      positionContext: {
        nodeDistance: 10,
        pointOfNodeTarget: () => [0, 0],
        lookupReference: () => undefined,
        toLocal: point => point,
        toWorld: point => point,
      },
    });
    const output = emitNodeOutput(compilation, shared.layout.round);
    expect(compilation.geometry.rect).toMatchObject({ x: 12, y: 24 });
    expect(
      flattenPrims(output.primitives).some(primitive => primitive.type === 'rect' && primitive.fill === 'red'),
    ).toBe(true);
    expect(output.bounds[0].boundsPoints).toHaveLength(4);
    expect(warnings).toEqual([]);
  });
});
