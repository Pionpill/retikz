import { describe, expect, it, vi } from 'vitest';

import { compileNode, compileToScene, createCompileEnvironment, resolveScopeContext } from '../../src';
import type { IRNode } from '../../src';
import { emitNodePrimitives } from '../../src/compile/node';
import { createPaintRegistry } from '../../src/compile/resource';
import { flattenPrims } from '../helpers/flatten';

describe('节点有效属性与布局复用', () => {
  it('节点与标签引线的虚线变化复用布局并更新绘制输出', () => {
    const environment = createCompileEnvironment();
    const context = { environment, context: resolveScopeContext({}, environment), irPath: 'root' };
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
    const first = compileNode(source, context);
    const next = compileNode(nextSource, context);
    if (first.status !== 'compiled' || next.status !== 'compiled') throw new Error('expected compiled node');
    expect(next.compiled.layout).toEqual(first.compiled.layout);
    const reused = emitNodePrimitives(
      { ...first.compiled, properties: next.compiled.properties },
      environment.round,
      createPaintRegistry(environment.round).register,
    );
    expect(reused).toEqual(next.compiled.output.primitives);
    const strokes = flattenPrims(reused).filter(primitive => primitive.type === 'path' || primitive.type === 'rect');
    expect(strokes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dashPattern: [6, 7], dashOffset: 3 }),
        expect.objectContaining({ stroke: 'red', dashPattern: [8, 9], dashOffset: 4 }),
      ]),
    );
    expect(first.compiled.properties.dashPattern).toEqual([2, 3]);
  });

  it('复用折行布局绘制当前作者行外观，不重复度量且不修改旧输出', () => {
    const measureText = vi.fn((text: string) => ({ width: text.length, height: 14 }));
    const environment = createCompileEnvironment({ measureText });
    const result = compileNode(
      {
        type: 'node',
        position: [0, 0],
        layout: { maxTextWidth: 3 },
        text: [
          { text: 'aaa bbb', fill: 'red' },
          { text: 'ccc', fill: 'blue' },
        ],
      },
      { environment, context: resolveScopeContext({}, environment), irPath: 'root' },
    );
    if (result.status !== 'compiled') throw new Error('expected compiled node');
    expect(result.compiled.irPath).toBe('root');
    const measured = measureText.mock.calls.length;
    const output = JSON.stringify(result.compiled.output);
    const properties = {
      ...result.compiled.properties,
      text: result.compiled.properties.text?.map((line, index) => ({
        ...line,
        style: { ...line.style, fill: index === 0 ? 'green' : 'purple' },
        segments: line.segments.map(segment => ({ ...segment, fill: index === 0 ? 'green' : 'purple' })),
      })),
    };
    const primitives = emitNodePrimitives(
      { ...result.compiled, properties },
      environment.round,
      createPaintRegistry(environment.round).register,
    );
    const text = flattenPrims(primitives).find(primitive => primitive.type === 'text');
    expect(text?.lines.map(line => ({ text: line.text, fill: line.fill }))).toEqual([
      { text: 'aaa', fill: 'green' },
      { text: 'bbb', fill: 'green' },
      { text: 'ccc', fill: 'purple' },
    ]);
    expect(measureText).toHaveBeenCalledTimes(measured);
    expect(JSON.stringify(result.compiled.output)).toBe(output);
  });

  it('颜色改变有效属性但不改变布局，静态与单元素输出保持一致', () => {
    const environment = createCompileEnvironment();
    const context = { environment, context: resolveScopeContext({}, environment), irPath: 'root' };
    const source: IRNode = {
      type: 'node',
      id: 'a',
      position: [10, 20],
      text: 'hello',
      style: { fill: 'red', textColor: 'blue' },
    };
    const first = compileNode(source, context);
    const next = compileNode({ ...source, style: { fill: 'green', textColor: 'purple' } }, context);
    if (first.status !== 'compiled' || next.status !== 'compiled') throw new Error('expected compiled node');
    expect(next.compiled.layout).toEqual(first.compiled.layout);
    expect(next.compiled.properties).not.toEqual(first.compiled.properties);
    expect(next.compiled.properties.id).toBe('a');
    expect(first.compiled.output.primitives).toEqual(
      compileToScene({ type: 'scene', version: 1, children: [source] }).scene.primitives,
    );
  });
});
