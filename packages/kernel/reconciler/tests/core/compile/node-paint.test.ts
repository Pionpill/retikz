import { describe, expect, it, vi } from 'vitest';

import {
  resolveNode,
  layoutNode,
  emitNodeOutput,
  createPositionResolveContext,
  resolveScopeStyle,
} from '../../../../core/src';
import type { IRNode, ScopeStyleResolution } from '../../../../core/src';
import { emitNodePrimitives } from '../../../../core/src/compile/node';
import { createPaintRegistry } from '../../../../core/src/compile/resource';
import { flattenPrims } from '../../../../core/tests/helpers/flatten';
import { compileToScene, createSharedCompileContext } from '../../../src/compile';
import type { SharedCompileContext } from '../../../src/compile';

const compileTestNode = (
  input: IRNode,
  context: { shared: SharedCompileContext; style: ScopeStyleResolution; irPath: Array<string> },
) => {
  const { shared, style, irPath } = context;
  const resolution = resolveNode(input, {
    ...shared.registries,
    ...shared.layout,
    scopeDefaults: style.defaults,
    mode: style.theme.mode,
    irPath,
    warn: () => {},
  });
  const compilation = layoutNode(resolution, {
    measureText: shared.host.measureText,
    positionContext: createPositionResolveContext({
      nodeDistance: shared.layout.nodeDistance,
      lookupReference: () => undefined,
    }),
  });
  const output = emitNodeOutput(compilation, {
    round: shared.layout.round,
    registerPaint: createPaintRegistry(shared.layout.round).register,
  });
  return { ...compilation, output };
};

describe('节点有效属性与布局复用', () => {
  it('节点与标签引线的虚线变化复用布局并更新绘制输出', () => {
    const shared = createSharedCompileContext();
    const context = { shared, style: resolveScopeStyle({}, shared.registries.themeRegistry), irPath: ['root'] };
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
    expect(next.layout).toEqual(first.layout);
    const reused = emitNodePrimitives(
      { ...first, properties: next.properties },
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
    expect(first.properties.dashPattern).toEqual([2, 3]);
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
      { shared, style: resolveScopeStyle({}, shared.registries.themeRegistry), irPath: ['root'] },
    );
    const measured = measureText.mock.calls.length;
    const output = JSON.stringify(result.output);
    const properties = {
      ...result.properties,
      text: result.properties.text?.map((line, index) => ({
        ...line,
        style: { ...line.style, fill: index === 0 ? 'green' : 'purple' },
        segments: line.segments.map(segment => ({ ...segment, fill: index === 0 ? 'green' : 'purple' })),
      })),
    };
    const primitives = emitNodePrimitives(
      { ...result, properties },
      shared.layout.round,
      createPaintRegistry(shared.layout.round).register,
    );
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
    const context = { shared, style: resolveScopeStyle({}, shared.registries.themeRegistry), irPath: ['root'] };
    const source: IRNode = {
      type: 'node',
      id: 'a',
      position: [10, 20],
      text: 'hello',
      style: { fill: 'red', textColor: 'blue' },
    };
    const first = compileTestNode(source, context);
    const next = compileTestNode({ ...source, style: { fill: 'green', textColor: 'purple' } }, context);
    expect(next.layout).toEqual(first.layout);
    expect(next.properties).not.toEqual(first.properties);
    expect(next.properties.id).toBe('a');
    expect(first.output.primitives).toEqual(
      compileToScene({ type: 'scene', version: 1, children: [source] }).scene.primitives,
    );
  });
});
