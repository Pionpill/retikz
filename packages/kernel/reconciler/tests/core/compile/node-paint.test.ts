import { describe, expect, it, vi } from 'vitest';

import {
  resolveNode,
  layoutNode,
  emitNodeOutput,
  createPositionEvaluateContext,
  resolveScopeInheritance,
} from '../../../../core/src';
import type { IRNode, CanonicalScopeInheritance } from '../../../../core/src';
import { emitNodePrimitives, compileNode } from '../../../../core/src/compile/node';
import { createPaintRegistry } from '../../../../core/src/compile/resource';
import { compileToScene, createSharedCompileContext } from '../../../src/compile';
import type { SharedCompileContext } from '../../../src/compile';
import { flattenPrims } from '../../helpers/flatten';

const compileTestNode = (
  input: IRNode,
  context: { shared: SharedCompileContext; style: CanonicalScopeInheritance; irPath: Array<string> },
) => {
  const { shared, style, irPath } = context;
  const resolution = resolveNode(input, {
    ...shared.registries,
    ...shared.layout,
    gatingOn: shared.host.lowerTex !== undefined,
    scopeDefaults: style.defaults,
    mode: style.theme.mode,
    irPath,
    warn: () => {},
  });
  const compileContext = {
    round: shared.layout.round,
    registerPaint: createPaintRegistry(shared.layout.round).register,
    measureText: shared.host.measureText,
    positionContext: createPositionEvaluateContext({
      nodeDistance: shared.layout.nodeDistance,
      lookupReference: () => undefined,
    }),
  };
  const compilation = layoutNode(resolution, compileContext).overall;
  const output = emitNodeOutput(
    compileNode(resolution, compileContext, { layout: { overall: compilation } }),
    shared.layout.round,
  );
  return {
    properties: resolution,
    layout: compilation,
    compileContext,
    context: { ...compilation, shape: resolution.shape, boundary: resolution.boundary },
    output,
  };
};

describe('节点有效属性与布局复用', () => {
  it('节点与标签引线的虚线变化复用布局并更新绘制输出', () => {
    const shared = createSharedCompileContext();
    const context = { shared, style: resolveScopeInheritance({}, shared.registries.themeRegistry), irPath: ['root'] };
    const source: IRNode = {
      type: 'node',
      position: [0, 0],
      text: 'node',
      style: { stroke: 'black', dashPattern: [2, 3], dashOffset: 1 },
      label: [{ text: 'label', position: 'top', pin: { stroke: 'red', dashPattern: [4, 5], dashOffset: 2 } }],
    };
    const nextSource: IRNode = {
      ...source,
      style: { stroke: 'black', dashPattern: [6, 7], dashOffset: 3 },
      label: [{ text: 'label', position: 'top', pin: { stroke: 'red', dashPattern: [8, 9], dashOffset: 4 } }],
    };
    const first = compileTestNode(source, context);
    const next = compileTestNode(nextSource, context);
    expect(next.context).toEqual(first.context);
    const reused = emitNodePrimitives(
      next.properties,
      first.context,
      shared.layout.round,
      createPaintRegistry(shared.layout.round).register,
    );
    expect(reused).toEqual(next.output.primitives);
    const strokes = flattenPrims(reused).filter(primitive => primitive.type === 'path' || primitive.type === 'rect');
    expect(strokes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dashPattern: [6, 7], dashOffset: 3 }),
        expect.objectContaining({ stroke: 'red', dashPattern: [8, 9], dashOffset: 4 }),
      ]),
    );
    expect(first.properties.style.dashPattern).toEqual([2, 3]);
  });

  it('复用折行布局绘制当前作者行外观，不重复度量且不修改旧输出', () => {
    const measureText = vi.fn((text: string) => ({ width: text.length, height: 14 }));
    const shared = createSharedCompileContext({ measureText });
    const result = compileTestNode(
      {
        type: 'node',
        position: [0, 0],
        layout: { maxTextWidth: 3 },
        text: [
          { text: 'aaa bbb', fill: 'red' },
          { text: 'ccc', fill: 'blue' },
        ],
      },
      { shared, style: resolveScopeInheritance({}, shared.registries.themeRegistry), irPath: ['root'] },
    );
    const measured = measureText.mock.calls.length;
    const output = JSON.stringify(result.output);
    const properties = {
      ...result.properties,
      text:
        result.properties.text === undefined
          ? undefined
          : {
              ...result.properties.text,
              lines: result.properties.text.lines.map((line, index) => ({
                ...line,
                style: { ...line.style, fill: index === 0 ? 'green' : 'purple' },
                segments: line.segments.map(segment => ({ ...segment, fill: index === 0 ? 'green' : 'purple' })),
              })),
            },
    };
    const primitives = emitNodeOutput(
      compileNode(properties, result.compileContext, { layout: { overall: result.layout } }),
      shared.layout.round,
    ).primitives;
    const text = flattenPrims(primitives).find(primitive => primitive.type === 'text');
    expect(text?.lines.map(line => ({ text: line.text, fill: line.fill }))).toEqual([
      { text: 'aaa', fill: 'green' },
      { text: 'bbb', fill: 'green' },
      { text: 'ccc', fill: 'purple' },
    ]);
    expect(measureText).toHaveBeenCalledTimes(measured);
    expect(JSON.stringify(result.output)).toBe(output);
  });

  it('颜色改变有效属性但不改变布局，静态与单元素输出保持一致', () => {
    const shared = createSharedCompileContext();
    const context = { shared, style: resolveScopeInheritance({}, shared.registries.themeRegistry), irPath: ['root'] };
    const source: IRNode = {
      type: 'node',
      id: 'a',
      position: [10, 20],
      text: 'hello',
      style: { fill: 'red', textColor: 'blue' },
    };
    const first = compileTestNode(source, context);
    const next = compileTestNode({ ...source, style: { fill: 'green', textColor: 'purple' } }, context);
    expect(next.context).toEqual(first.context);
    expect(next.properties).not.toEqual(first.properties);
    expect(next.properties.id).toBe('a');
    expect(first.output.primitives).toEqual(
      compileToScene({ type: 'scene', version: 1, children: [source] }).scene.primitives,
    );
  });
});
