import { projectNodeGeometry } from '@retikz/core';
import type { IRCoordinate, IRNode, IRScene, IRScope, ShapeDefinition } from '@retikz/core';
import {
  projectReferenceGeometry,
  projectLayoutWithTransform,
  composeScopeTransform,
  resolveScopeInheritance,
  evaluateAnchorReference,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { BUILTIN_SHAPES } from '../../../core/src/providers/shape/shape';
import { createSharedCompileContext } from '../../src/compile';
import { compareReferenceGeometry } from '../../src/compile/compare';
import { RetikzReconcilerError } from '../../src/error';
import { WeaveManager } from '../../src/weave';
import type { WeaveBinding } from '../helpers/atomic-runtime';
import { compileTestResult } from '../helpers/compilation';
import { testCompileNode, testCompileCoordinate, testCompilePath } from '../helpers/element';

const ancestor = {};

describe('独立元素编译', () => {
  it('引用投影先应用自身变换再应用父级变换，且不修改局部布局', () => {
    const layout = { position: [2, 3] as [number, number] };
    const original = structuredClone(layout);
    const identity = projectReferenceGeometry(layout, composeScopeTransform([]));
    expect(identity).toEqual(original);
    const projected = projectReferenceGeometry(
      layout,
      composeScopeTransform([
        { kind: 'scale', x: 2, y: 3 },
        { kind: 'translate', x: 5, y: 7 },
      ]),
    );
    expect(projected).toEqual({ position: [14, 30] });
    expect(layout).toEqual(original);
  });
  it('查询回调真实异常保留 cause，不误判为依赖等待', () => {
    const shared = createSharedCompileContext();
    const failure = new Error('lookup failed');
    const bindings = new Map<string, WeaveBinding>();
    bindings.get = () => {
      throw failure;
    };
    let caught: unknown;
    try {
      testCompileCoordinate(
        { type: 'coordinate', id: 'b', position: { direction: 'right' as const, of: 'a', distance: 10 } },
        {
          shared,
          style: resolveScopeInheritance({}, shared.registries.themeRegistry),
          irPath: ['children', 1],
          namespace: { bindings },
        },
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RetikzReconcilerError);
    expect(caught).toHaveProperty('cause', failure);
  });

  it('引用投影保留自定义 shape 定义与锚点语义，不重新绘制或修改旧布局', () => {
    let emitted = 0;
    const definition: ShapeDefinition = {
      ...BUILTIN_SHAPES.get('rectangle')!,
      name: 'counted',
      resolveAnchor: (rect, name, params) =>
        name === 'query'
          ? [rect.x + 7, rect.y - 4]
          : BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, name, params),
      emit: (...args) => {
        emitted += 1;
        return BUILTIN_SHAPES.get('rectangle')!.emit(...args);
      },
    };
    const shared = createSharedCompileContext({ shapes: [definition] });
    const result = testCompileNode(
      { type: 'node', position: [2, 3], shape: 'counted' },
      {
        shared,
        style: resolveScopeInheritance({}, shared.registries.themeRegistry),
        irPath: ['children', 0],
      },
    );
    if (result.status !== 'compiled') throw new Error('expected node');
    const rectangle = { ...projectNodeGeometry(result.compiled.compiled).geometry.rect };
    expect(projectNodeGeometry(result.compiled.compiled).shape.definition).toBe(definition);
    expect(evaluateAnchorReference(projectNodeGeometry(result.compiled.compiled), 'query')).toEqual([
      rectangle.x + 7,
      rectangle.y - 4,
    ]);
    expect(
      compareReferenceGeometry(
        projectNodeGeometry(result.compiled.compiled),
        {
          ...projectNodeGeometry(result.compiled.compiled),
          shape: { ...projectNodeGeometry(result.compiled.compiled).shape, definition: { ...definition } },
        },
        'boundary',
      ),
    ).toBe(false);
    const count = emitted;
    const projected = projectLayoutWithTransform(
      projectNodeGeometry(result.compiled.compiled),
      composeScopeTransform([{ kind: 'translate', x: 20, y: 30 }]),
    );
    expect(projected.shape.definition).toBe(definition);
    expect(evaluateAnchorReference(projected, 'query')).toEqual([rectangle.x + 27, rectangle.y + 26]);
    expect(projectNodeGeometry(result.compiled.compiled).geometry.rect).toEqual(rectangle);
    expect(emitted).toBe(count);
  });

  it('嵌套作用域经过祖先裁剪时保持全量可见边界和资源语义', () => {
    const outer: Omit<IRScope, 'children'> = {
      type: 'scope',
      id: 'outer',
      position: [20, 30],
      clip: { kind: 'rect', params: { x: -10, y: -10, width: 20, height: 20 } },
    };
    const inner: Omit<IRScope, 'children'> = { type: 'scope', id: 'inner', position: [5, 8] };
    const input: IRNode = { type: 'node', position: [0, 0], text: 'A' };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ ...outer, children: [{ ...inner, children: [input] }] }],
    };
    const mounted = new WeaveManager(source).mount();
    expect(mounted.compilation.result).toEqual(compileTestResult(source));
    expect(mounted.compilation.result.scene.resources).toHaveLength(1);
  });

  it('引用从 pending 就绪后可重算，祖先包络引用仍报错', () => {
    const shared = createSharedCompileContext();
    const context = { shared, style: resolveScopeInheritance({}, shared.registries.themeRegistry), irPath: ['a'] };
    const input: IRCoordinate = { type: 'coordinate', id: 'c', position: { direction: 'right', of: 'a' } };
    expect(
      testCompileCoordinate(input, {
        ...context,
        namespace: { bindings: new Map([['a', { state: 'pending', binding: ancestor }]]) },
      }),
    ).toMatchObject({
      status: 'pending',
    });
    expect(() =>
      testCompileCoordinate(input, {
        ...context,
        namespace: { bindings: new Map([['a', { state: 'pending', binding: ancestor }]]) },
        ancestorScopes: new Set([ancestor]),
      }),
    ).toThrow('ancestor Scope');
    const node = testCompileNode({ type: 'node', id: 'a', position: [30, 10] }, context);
    if (node.status !== 'compiled') throw new Error('expected node');
    const result = testCompileCoordinate(input, {
      ...context,
      namespace: {
        bindings: new Map([
          [
            'a',
            {
              state: 'ready',
              binding: {},
              layout: projectNodeGeometry(node.compiled.compiled),
            },
          ],
        ]),
      },
    });
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') throw new Error('expected coordinate');
    expect(result.compiled.position[0]).toBeGreaterThan(30);
  });

  it('独立编译的不同渐变内容具有不同资源身份', () => {
    const shared = createSharedCompileContext();
    const context = { shared, style: resolveScopeInheritance({}, shared.registries.themeRegistry), irPath: [] };
    const first = testCompileNode(
      {
        type: 'node',
        position: [0, 0],
        style: {
          fill: {
            kind: 'linearGradient',
            angle: 0,
            stops: [
              { offset: 0, color: 'red' },
              { offset: 1, color: 'white' },
            ],
          },
        },
      },
      context,
    );
    const second = testCompileNode(
      {
        type: 'node',
        position: [40, 0],
        style: {
          fill: {
            kind: 'linearGradient',
            angle: 90,
            stops: [
              { offset: 0, color: 'blue' },
              { offset: 1, color: 'white' },
            ],
          },
        },
      },
      context,
    );
    if (first.status !== 'compiled' || second.status !== 'compiled') throw new Error('expected nodes');
    expect(first.compiled.output.resources[0].id).not.toBe(second.compiled.output.resources[0].id);
  });
  it('未就绪引用返回 pending，不暴露半成品', () => {
    const shared = createSharedCompileContext();
    const pending = testCompileCoordinate(
      { type: 'coordinate', id: 'b', position: { direction: 'right', of: 'a' } },
      {
        shared,
        style: resolveScopeInheritance({}, shared.registries.themeRegistry),
        irPath: ['b'],
        namespace: { bindings: new Map([['a', { state: 'pending', binding: ancestor }]]) },
      },
    );
    const pendingPath = testCompilePath(
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'a' } },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
      {
        shared,
        style: resolveScopeInheritance({}, shared.registries.themeRegistry),
        irPath: [],
        namespace: { bindings: new Map([['a', { state: 'pending', binding: ancestor }]]) },
      },
    );
    expect(pendingPath.status).toBe('pending');
    expect(pendingPath).not.toHaveProperty('compiled');
    expect(pending.status).toBe('pending');
    expect(pending).not.toHaveProperty('compiled');
    expect(pending).not.toHaveProperty('diagnostics');
  });

  it('独立 Path 与全量路径生成相同输出', () => {
    const shared = createSharedCompileContext();
    const input = {
      type: 'path' as const,
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [30, 20] as [number, number] },
      ],
    };
    const result = testCompilePath(input, {
      shared,
      style: resolveScopeInheritance({}, shared.registries.themeRegistry),
      irPath: ['scene', 'children', 0],
    });
    if (result.status !== 'compiled') throw new Error('expected compiled');
    expect(result.compiled.output.primitives).toEqual(
      compileTestResult({
        version: 1,
        type: 'scene',
        children: [input],
      }).scene.primitives,
    );
  });
  it('节点使用完整编译相同的测量与绘制语义', () => {
    const input: IRNode = { type: 'node', id: 'a', position: [12, 24], text: 'hello' };
    const shared = createSharedCompileContext();
    const result = testCompileNode(input, {
      shared,
      style: resolveScopeInheritance({}, shared.registries.themeRegistry),
      irPath: ['scene', 'children', 0],
    });
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') return;
    expect(projectNodeGeometry(result.compiled.compiled).geometry.rect.x).toBe(12);
    expect(projectNodeGeometry(result.compiled.compiled).geometry.rect.y).toBe(24);
    expect(result.compiled.output.primitives).toEqual(
      compileTestResult({ version: 1, type: 'scene', children: [input] }).scene.primitives,
    );
  });

  it('Scope 默认样式经同一规则作用于节点', () => {
    const shared = createSharedCompileContext();
    const scope = { defaults: { node: { style: { fill: 'red' } } } };
    const input: IRNode = { type: 'node', position: [0, 0] };
    const result = testCompileNode(input, {
      shared,
      style: resolveScopeInheritance(scope, shared.registries.themeRegistry),
      irPath: ['scene', 'children', 0, 'children', 0],
    });
    if (result.status !== 'compiled') throw new Error('expected compiled');
    const full = compileTestResult({
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', ...scope, children: [input] }],
    });
    const group = full.scene.primitives[0];
    if (group.type !== 'group') throw new Error('expected group');
    expect(result.compiled.output.primitives).toEqual(group.children);
  });
});
