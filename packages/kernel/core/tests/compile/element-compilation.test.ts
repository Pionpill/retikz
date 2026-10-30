import { describe, expect, it } from 'vitest';

import type {
  ElementCompileReference,
  SharedCompileContext,
  CompileOutput,
  IRCoordinate,
  IRNode,
  IRPathBase,
  IRScope,
  ShapeDefinition,
} from '../../src';
import {
  assembleSceneCompilationSnapshot,
  assembleCompileOutputs,
  computeCompileOutputBounds,
  assembleScopeOutput,
  BUILTIN_SHAPES,
  compileCoordinate,
  compileNode,
  compilePath,
  compileScope,
  compileToScene,
  createSharedCompileContext,
  prepareScopeCompilation,
  projectCompileReference,
  RetikzCoreError,
  resolveScopeContext,
} from '../../src';

const finalizeOutputs = (input: { root: {}; outputs: ReadonlyArray<CompileOutput>; shared: SharedCompileContext }) => {
  const output = assembleCompileOutputs(input.outputs, input.shared);
  return assembleSceneCompilationSnapshot({
    root: input.root,
    primitives: output.primitives,
    resources: output.resources,
    layoutBounds: computeCompileOutputBounds(output),
    round: input.shared.layout.round,
  });
};

describe('独立元素编译', () => {
  it('查询回调真实异常保留 cause，不误判为依赖等待', () => {
    const shared = createSharedCompileContext();
    const failure = new Error('lookup failed');
    let caught: unknown;
    try {
      compileCoordinate(
        { type: 'coordinate', id: 'b', position: { direction: 'right' as const, of: 'a', distance: 10 } },
        {
          shared,
          context: resolveScopeContext({}, shared),
          irPath: ['children', 1],
          lookupReference: () => {
            throw failure;
          },
        },
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RetikzCoreError);
    expect(caught).toHaveProperty('cause', failure);
  });

  it('顶层 Path 等待两个 Scope 的节点投影后编译，保持声明绘制顺序', () => {
    const shared = createSharedCompileContext();
    const context = { shared, context: resolveScopeContext({}, shared), irPath: ['root'] };
    const bindings = new Map<string, ElementCompileReference>();
    const outputs: Array<CompileOutput> = [];
    const scopes: Array<IRScope> = [];
    for (const [index, id] of ['a', 'b'].entries()) {
      const input: IRNode = { type: 'node', id, position: [0, 0], text: id };
      const scopeInput: IRScope = { type: 'scope', position: [index * 100, index * 30], children: [input] };
      scopes.push(scopeInput);
      const prepared = prepareScopeCompilation(scopeInput, context);
      if (prepared.status !== 'compiled') throw new Error('expected scope');
      const node = compileNode(input, {
        ...context,
        context: prepared.compiled.scope,
        transforms: prepared.compiled.preliminaryTransforms,
      });
      if (node.status !== 'compiled') throw new Error('expected node');
      const scope = compileScope(scopeInput, prepared.compiled, [node.compiled.layout], context);
      if (scope.status !== 'compiled') throw new Error('expected scope');
      expect(scope.compiled.irPath).toBe(context.irPath);
      bindings.set(id, {
        state: 'ready',
        layout: projectCompileReference(
          { type: 'node', compiled: node.compiled },
          shared,
          scope.compiled.group.transforms,
        ),
      });
      outputs.push(assembleScopeOutput(scope.compiled, [node.compiled.output], shared));
    }
    const pathInput: IRPathBase = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'a' } },
        { type: 'step', kind: 'line', to: { id: 'b' } },
      ],
    };
    const reads: Array<string> = [];
    const path = compilePath(pathInput, {
      ...context,
      lookupReference: name => {
        reads.push(name);
        return bindings.get(name);
      },
    });
    if (path.status !== 'compiled') throw new Error('expected path');
    expect(path.compiled.irPath).toBe(context.irPath);
    expect(
      finalizeOutputs({
        root: {},
        outputs: [path.compiled.output, ...outputs],
        shared,
      }).result.scene,
    ).toEqual(compileToScene({ type: 'scene', version: 1, children: [pathInput, ...scopes] }).scene);
    expect(new Set(reads)).toEqual(new Set(['a', 'b']));
  });

  it('复用绘制片段不再次调用自定义 shape provider，引用投影不修改旧布局', () => {
    let emitted = 0;
    const definition: ShapeDefinition = {
      ...BUILTIN_SHAPES.get('rectangle')!,
      name: 'counted',
      emit: (...args) => {
        emitted += 1;
        return BUILTIN_SHAPES.get('rectangle')!.emit(...args);
      },
    };
    const shared = createSharedCompileContext({ shapes: [definition] });
    const result = compileNode(
      { type: 'node', position: [2, 3], shape: 'counted' },
      {
        shared,
        context: resolveScopeContext({}, shared),
        irPath: ['children', 0],
      },
    );
    if (result.status !== 'compiled') throw new Error('expected node');
    const rectangle = { ...result.compiled.layout.geometry.rect };
    const count = emitted;
    const first = finalizeOutputs({
      root: {},
      outputs: [result.compiled.output],
      shared,
    });
    const next = finalizeOutputs({
      root: {},
      outputs: [result.compiled.output],
      shared,
    });
    projectCompileReference({ type: 'node', compiled: result.compiled }, shared, [{ kind: 'translate', x: 20, y: 30 }]);
    expect(result.compiled.layout.geometry.rect).toEqual(rectangle);
    expect(next.result.scene).toEqual(first.result.scene);
    expect(emitted).toBe(count);
  });

  it('嵌套作用域经过祖先裁剪时保持全量可见边界和资源语义', () => {
    const shared = createSharedCompileContext();
    const context = { shared, context: resolveScopeContext({}, shared), irPath: ['children', 0] };
    const outer: Omit<IRScope, 'children'> = {
      type: 'scope',
      id: 'outer',
      position: [20, 30],
      clip: { kind: 'rect', params: { x: -10, y: -10, width: 20, height: 20 } },
    };
    const inner: Omit<IRScope, 'children'> = { type: 'scope', id: 'inner', position: [5, 8] };
    const input: IRNode = { type: 'node', position: [0, 0], text: 'A' };
    const a = prepareScopeCompilation(outer, context);
    if (a.status !== 'compiled') throw new Error('expected outer');
    const innerContext = { ...context, context: a.compiled.scope, irPath: ['children', 0, 'children', 0] };
    const b = prepareScopeCompilation(inner, innerContext);
    if (b.status !== 'compiled') throw new Error('expected inner');
    const node = compileNode(input, { ...innerContext, context: b.compiled.scope });
    if (node.status !== 'compiled') throw new Error('expected node');
    const child = compileScope(inner, b.compiled, [node.compiled.layout], innerContext);
    if (child.status !== 'compiled') throw new Error('expected inner compiled');
    const parent = compileScope(
      outer,
      a.compiled,
      [projectCompileReference({ type: 'scope', compiled: child.compiled }, shared)],
      context,
    );
    if (parent.status !== 'compiled') throw new Error('expected outer compiled');
    const output = assembleScopeOutput(
      parent.compiled,
      [assembleScopeOutput(child.compiled, [node.compiled.output], shared)],
      shared,
    );
    const full = compileToScene({
      type: 'scene',
      version: 1,
      children: [{ ...outer, children: [{ ...inner, children: [input] }] }],
    });
    expect(
      finalizeOutputs({
        root: {},
        outputs: [output],
        shared,
      }).result.scene,
    ).toEqual(full.scene);
  });

  it('引用从 pending 就绪后可重算，祖先包络引用仍报错', () => {
    const shared = createSharedCompileContext();
    const context = { shared, context: resolveScopeContext({}, shared), irPath: ['a'] };
    const input: IRCoordinate = { type: 'coordinate', id: 'c', position: { direction: 'right', of: 'a' } };
    expect(compileCoordinate(input, { ...context, lookupReference: () => ({ state: 'pending' }) })).toEqual({
      status: 'pending',
    });
    expect(() => compileCoordinate(input, { ...context, lookupReference: () => ({ state: 'ancestor' }) })).toThrow(
      'ancestor Scope',
    );
    const node = compileNode({ type: 'node', id: 'a', position: [30, 10] }, context);
    if (node.status !== 'compiled') throw new Error('expected node');
    const result = compileCoordinate(input, {
      ...context,
      lookupReference: () => ({
        state: 'ready',
        layout: projectCompileReference({ type: 'node', compiled: node.compiled }, shared),
      }),
    });
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') throw new Error('expected coordinate');
    expect(result.compiled.irPath).toBe(context.irPath);
    expect(result.compiled.position[0]).toBeGreaterThan(30);
  });

  it('同层 zIndex 排序与删除资源不重算旧状态', () => {
    const shared = createSharedCompileContext();
    const context = { shared, context: resolveScopeContext({}, shared), irPath: ['a'] };
    const a: IRNode = { type: 'node', id: 'a', position: [0, 0], zIndex: 3 };
    const b: IRNode = { type: 'node', id: 'b', position: [40, 0], zIndex: -1 };
    const first = compileNode(a, context);
    const second = compileNode(b, context);
    if (first.status !== 'compiled' || second.status !== 'compiled') throw new Error('expected nodes');
    expect(
      finalizeOutputs({
        root: {},
        outputs: [first.compiled.output, second.compiled.output],
        shared,
      }).result.scene,
    ).toEqual(compileToScene({ type: 'scene', version: 1, children: [a, b] }).scene);
    expect(
      finalizeOutputs({
        root: {},
        outputs: [],
        shared,
      }).result.scene.resources,
    ).toBeUndefined();
  });

  it('已编译 Scope 与子节点组装后等价于全量输出', () => {
    const shared = createSharedCompileContext();
    const parent = resolveScopeContext({}, shared);
    const scopeInput = { type: 'scope' as const, position: [30, 40] as [number, number] };
    const context = { shared, context: parent, irPath: ['scene', 'children', 0] };
    const prepared = prepareScopeCompilation(scopeInput, context);
    if (prepared.status !== 'compiled') throw new Error('expected scope preparation');
    const input: IRNode = { type: 'node', id: 'a', position: [12, 24], text: 'hello' };
    const node = compileNode(input, {
      ...context,
      context: prepared.compiled.scope,
      irPath: [...context.irPath, 'children', 0],
    });
    if (node.status !== 'compiled') throw new Error('expected node');
    const scope = compileScope(scopeInput, prepared.compiled, [node.compiled.layout], context);
    if (scope.status !== 'compiled') throw new Error('expected scope');
    const output = assembleScopeOutput(scope.compiled, [node.compiled.output], shared);
    const assembled = finalizeOutputs({
      root: {},
      outputs: [output],
      shared,
    });
    const full = compileToScene({ version: 1, type: 'scene', children: [{ ...scopeInput, children: [input] }] });
    expect(assembled.result.scene).toEqual(full.scene);
  });

  it('资源局部编号在组装时重映射，旧片段保持不变', () => {
    const shared = createSharedCompileContext();
    const context = { shared, context: resolveScopeContext({}, shared), irPath: [] };
    const first = compileNode(
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
    const second = compileNode(
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
    const before = structuredClone(first.compiled.output);
    const output = finalizeOutputs({
      root: {},
      outputs: [first.compiled.output, second.compiled.output],
      shared,
    });
    expect(output.result.scene.primitives).toHaveLength(2);
    expect(output.result.scene.resources).toHaveLength(2);
    expect(first.compiled.output.resources[0].id).toBe(second.compiled.output.resources[0].id);
    expect(new Set(output.result.scene.resources?.map(resource => resource.id)).size).toBe(2);
    expect(first.compiled.output).toEqual(before);
  });
  it('未就绪引用返回 pending，不暴露半成品', () => {
    const shared = createSharedCompileContext();
    const pending = compileCoordinate(
      { type: 'coordinate', id: 'b', position: { direction: 'right', of: 'a' } },
      {
        shared,
        context: resolveScopeContext({}, shared),
        irPath: ['b'],
        lookupReference: () => ({ state: 'pending' }),
      },
    );
    const pendingPath = compilePath(
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'a' } },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
      {
        shared,
        context: resolveScopeContext({}, shared),
        irPath: [],
        lookupReference: () => ({ state: 'pending' }),
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
    const result = compilePath(input, {
      shared,
      context: resolveScopeContext({}, shared),
      irPath: ['scene', 'children', 0],
    });
    if (result.status !== 'compiled') throw new Error('expected compiled');
    expect(result.compiled.output.primitives).toEqual(
      compileToScene({
        version: 1,
        type: 'scene',
        children: [input],
      }).scene.primitives,
    );
  });
  it('节点使用完整编译相同的测量与绘制语义', () => {
    const input: IRNode = { type: 'node', id: 'a', position: [12, 24], text: 'hello' };
    const shared = createSharedCompileContext();
    const result = compileNode(input, {
      shared,
      context: resolveScopeContext({}, shared),
      irPath: ['scene', 'children', 0],
    });
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') return;
    expect(result.compiled.layout.geometry.rect.x).toBe(12);
    expect(result.compiled.layout.geometry.rect.y).toBe(24);
    expect(result.compiled.output.primitives).toEqual(
      compileToScene({ version: 1, type: 'scene', children: [input] }).scene.primitives,
    );
  });

  it('Scope 默认样式经同一规则作用于节点', () => {
    const shared = createSharedCompileContext();
    const scope = { defaults: { node: { style: { fill: 'red' } } } };
    const input: IRNode = { type: 'node', position: [0, 0] };
    const result = compileNode(input, {
      shared,
      context: resolveScopeContext(scope, shared),
      irPath: ['scene', 'children', 0, 'children', 0],
    });
    if (result.status !== 'compiled') throw new Error('expected compiled');
    const full = compileToScene({
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', ...scope, children: [input] }],
    });
    const group = full.scene.primitives[0];
    if (group.type !== 'group') throw new Error('expected group');
    expect(result.compiled.output.primitives).toEqual(group.children);
  });
});
