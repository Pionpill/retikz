import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { CompileBinding, CompileOutput, IRPathBase } from '../../src';
import { definePathKind, PathSchema } from '../../src';
import { BUILTIN_SHAPES } from '../../src';
import type { IRScope, ShapeDefinition } from '../../src';
import { createCompileObservationRuntime, observeCompileToScene, projectCompileReference } from '../../src';
import type { CompileObservation, CompileObserverDefinition, CompileNamespace, IRCoordinate } from '../../src';
import {
  compileCoordinate,
  compileNode,
  compilePath,
  compileToScene,
  createCompileEnvironment,
  resolveScopeContext,
} from '../../src';
import type { IRNode } from '../../src';
import { assembleSceneCompilation, assembleScopeOutput, compileScope, prepareScopeCompilation } from '../../src';

describe('独立元素编译', () => {
  it('顶层 Path 等待两个 Scope 的节点投影后编译，保持声明绘制顺序', () => {
    const environment = createCompileEnvironment();
    const context = { environment, context: resolveScopeContext({}, environment), irPath: 'root' };
    const bindings = new Map<string, CompileBinding>();
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
        binding: {},
        layout: projectCompileReference(
          { type: 'node', compiled: node.compiled },
          environment,
          scope.compiled.group.transforms,
        ),
      });
      outputs.push(assembleScopeOutput(scope.compiled, [node.compiled.output], environment));
    }
    const pathInput: IRPathBase = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'a' } },
        { type: 'step', kind: 'line', to: { id: 'b' } },
      ],
    };
    const path = compilePath(pathInput, { ...context, namespace: { bindings } });
    if (path.status !== 'compiled') throw new Error('expected path');
    expect(path.compiled.irPath).toBe(context.irPath);
    expect(assembleSceneCompilation({}, [path.compiled.output, ...outputs], environment).result.scene).toEqual(
      compileToScene({ type: 'scene', version: 1, children: [pathInput, ...scopes] }).scene,
    );
    expect(new Set(path.reads.map(read => read.name))).toEqual(new Set(['a', 'b']));
  });

  it('自定义 Path 的 owner 输出随局部片段发布且组装不重算', () => {
    const seen: Array<CompileObservation> = [];
    const observer: CompileObserverDefinition = {
      key: 'custom-path',
      createSession: () => ({
        select: site => site.owner.kind === 'path',
        observe: value => {
          seen.push(value);
        },
        complete: () => null,
      }),
    };
    let calls = 0;
    const kind = definePathKind({
      name: 'cached-path',
      schema: PathSchema.extend({ kind: literal('cached-path') }),
      ownerOutput: true,
      compile: context => {
        calls += 1;
        if (context.ownerOutput.requested) context.ownerOutput.publish({ label: 'cached' });
        return {
          primitives: [{ type: 'rect', x: 0, y: 0, width: 10, height: 1 }],
          boundsPoints: [
            [0, 0],
            [10, 1],
          ],
        };
      },
    });
    const environment = createCompileEnvironment({ pathKinds: [kind] });
    const observation = createCompileObservationRuntime([observer]);
    const result = compilePath(
      {
        type: 'path',
        kind: 'cached-path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
      {
        environment,
        observation,
        context: resolveScopeContext({}, environment),
        irPath: 'children[0].path',
      },
    );
    if (result.status !== 'compiled') throw new Error('expected path');
    const count = calls;
    const assembled = assembleSceneCompilation({}, [result.compiled.output], environment, { observation });
    expect(assembled.result.scene.primitives).toHaveLength(1);
    expect(seen).toHaveLength(1);
    expect(calls).toBe(count);
    const isolated = [...seen];
    seen.length = 0;
    observeCompileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            type: 'path',
            kind: 'cached-path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      },
      { pathKinds: [kind] },
      [observer],
    );
    expect(isolated).toEqual(seen);
  });

  it('复用绘制片段不再次调用自定义 shape provider，引用投影不修改旧布局', () => {
    let emitted = 0;
    const definition: ShapeDefinition = {
      ...BUILTIN_SHAPES.rectangle,
      name: 'counted',
      emit: (...args) => {
        emitted += 1;
        return BUILTIN_SHAPES.rectangle.emit(...args);
      },
    };
    const environment = createCompileEnvironment({ shapes: [definition] });
    const result = compileNode(
      { type: 'node', position: [2, 3], shape: 'counted' },
      {
        environment,
        context: resolveScopeContext({}, environment),
        irPath: 'children[0].node',
      },
    );
    if (result.status !== 'compiled') throw new Error('expected node');
    const rectangle = { ...result.compiled.layout.geometry.rect };
    const count = emitted;
    const first = assembleSceneCompilation({}, [result.compiled.output], environment);
    const next = assembleSceneCompilation({}, [result.compiled.output], environment);
    projectCompileReference({ type: 'node', compiled: result.compiled }, environment, [
      { kind: 'translate', x: 20, y: 30 },
    ]);
    expect(result.compiled.layout.geometry.rect).toEqual(rectangle);
    expect(next.result.scene).toEqual(first.result.scene);
    expect(emitted).toBe(count);
  });

  it('嵌套作用域经过祖先裁剪时保持全量可见边界和资源语义', () => {
    const environment = createCompileEnvironment();
    const context = { environment, context: resolveScopeContext({}, environment), irPath: 'children[0].scope' };
    const outer: Omit<IRScope, 'children'> = {
      type: 'scope',
      id: 'outer',
      position: [20, 30],
      clip: { kind: 'rect', x: -10, y: -10, width: 20, height: 20 },
    };
    const inner: Omit<IRScope, 'children'> = { type: 'scope', id: 'inner', position: [5, 8] };
    const input: IRNode = { type: 'node', position: [0, 0], text: 'A' };
    const a = prepareScopeCompilation(outer, context);
    if (a.status !== 'compiled') throw new Error('expected outer');
    const innerContext = { ...context, context: a.compiled.scope, irPath: 'children[0].scope.children[0].scope' };
    const b = prepareScopeCompilation(inner, innerContext);
    if (b.status !== 'compiled') throw new Error('expected inner');
    const node = compileNode(input, { ...innerContext, context: b.compiled.scope });
    if (node.status !== 'compiled') throw new Error('expected node');
    const child = compileScope(inner, b.compiled, [node.compiled.layout], innerContext);
    if (child.status !== 'compiled') throw new Error('expected inner compiled');
    const parent = compileScope(
      outer,
      a.compiled,
      [projectCompileReference({ type: 'scope', compiled: child.compiled }, environment)],
      context,
    );
    if (parent.status !== 'compiled') throw new Error('expected outer compiled');
    const output = assembleScopeOutput(
      parent.compiled,
      [assembleScopeOutput(child.compiled, [node.compiled.output], environment)],
      environment,
    );
    const full = compileToScene({
      type: 'scene',
      version: 1,
      children: [{ ...outer, children: [{ ...inner, children: [input] }] }],
    });
    expect(assembleSceneCompilation({}, [output], environment).result.scene).toEqual(full.scene);
  });

  it('引用跟踪保留未命中命名空间，pending 就绪后可重算且禁止祖先包络引用', () => {
    const environment = createCompileEnvironment();
    const context = { environment, context: resolveScopeContext({}, environment), irPath: 'a' };
    const input: IRCoordinate = { type: 'coordinate', id: 'c', position: { direction: 'right', of: 'a' } };
    const binding = {};
    const outer: CompileNamespace = { bindings: new Map([['a', { state: 'pending', binding }]]) };
    const inner: CompileNamespace = { bindings: new Map(), parent: outer };
    expect(compileCoordinate(input, { ...context, namespace: inner }).reads.map(read => read.state)).toEqual([
      'missing',
      'pending',
    ]);
    expect(() =>
      compileCoordinate(input, { ...context, namespace: inner, ancestorScopes: new Set([binding]) }),
    ).toThrow('ancestor Scope');
    const node = compileNode({ type: 'node', id: 'a', position: [30, 10] }, context);
    if (node.status !== 'compiled') throw new Error('expected node');
    const ready: CompileNamespace = {
      bindings: new Map([
        [
          'a',
          {
            state: 'ready',
            binding,
            layout: projectCompileReference({ type: 'node', compiled: node.compiled }, environment),
          },
        ],
      ]),
    };
    const result = compileCoordinate(input, { ...context, namespace: { bindings: new Map(), parent: ready } });
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') throw new Error('expected coordinate');
    expect(result.compiled.irPath).toBe(context.irPath);
    expect(result.reads.map(read => read.state)).toEqual(['missing', 'ready']);
  });

  it('同层 zIndex 排序与删除资源不重算旧状态', () => {
    const environment = createCompileEnvironment();
    const context = { environment, context: resolveScopeContext({}, environment), irPath: 'a' };
    const a: IRNode = { type: 'node', id: 'a', position: [0, 0], zIndex: 3 };
    const b: IRNode = { type: 'node', id: 'b', position: [40, 0], zIndex: -1 };
    const first = compileNode(a, context);
    const second = compileNode(b, context);
    if (first.status !== 'compiled' || second.status !== 'compiled') throw new Error('expected nodes');
    expect(
      assembleSceneCompilation({}, [first.compiled.output, second.compiled.output], environment).result.scene,
    ).toEqual(compileToScene({ type: 'scene', version: 1, children: [a, b] }).scene);
    expect(assembleSceneCompilation({}, [], environment).result.scene.resources).toBeUndefined();
  });

  it('Scope 变换后观察输出和布局产物与全量编译一致', () => {
    const observed: Array<CompileObservation> = [];
    const observer: CompileObserverDefinition = {
      key: 'elements',
      createSession: () => ({
        select: () => true,
        observe: value => {
          observed.push(value);
        },
        complete: () => null,
      }),
    };
    const observation = createCompileObservationRuntime([observer]);
    const environment = createCompileEnvironment({ artifacts: { nodeLayouts: true } });
    const input: IRNode = { type: 'node', id: 'a', position: [12, 24], text: 'hello' };
    const scopeInput = { type: 'scope' as const, position: [30, 40] as [number, number] };
    const occurrence = { sourcePath: 'children[0].scope', expansionPath: [] };
    const context = {
      environment,
      observation,
      context: resolveScopeContext({}, environment),
      irPath: occurrence.sourcePath,
      occurrence,
    };
    const prepared = prepareScopeCompilation(scopeInput, context);
    if (prepared.status !== 'compiled') throw new Error('expected preparation');
    const node = compileNode(input, {
      ...context,
      context: prepared.compiled.scope,
      irPath: 'children[0].scope.children[0].node',
      occurrence: { sourcePath: 'children[0].scope.children[0].node', expansionPath: [] },
      ancestors: [{ owner: { kind: 'scope' }, occurrence }],
    });
    if (node.status !== 'compiled') throw new Error('expected node');
    const scope = compileScope(scopeInput, prepared.compiled, [node.compiled.layout], context);
    if (scope.status !== 'compiled') throw new Error('expected scope');
    const result = assembleSceneCompilation(
      {},
      [assembleScopeOutput(scope.compiled, [node.compiled.output], environment)],
      environment,
      { observation },
    );
    const incrementalObservations = [...observed];
    observed.length = 0;
    const full = observeCompileToScene(
      { type: 'scene', version: 1, children: [{ ...scopeInput, children: [input] }] },
      { artifacts: { nodeLayouts: true } },
      [observer],
    );
    expect(incrementalObservations).toEqual(observed);
    expect(result.result.artifacts).toEqual(full.primary.artifacts);
  });

  it('已编译 Scope 与子节点组装后等价于全量输出', () => {
    const environment = createCompileEnvironment();
    const parent = resolveScopeContext({}, environment);
    const scopeInput = { type: 'scope' as const, position: [30, 40] as [number, number] };
    const context = { environment, context: parent, irPath: 'scene.children[0].scope' };
    const prepared = prepareScopeCompilation(scopeInput, context);
    if (prepared.status !== 'compiled') throw new Error('expected scope preparation');
    const input: IRNode = { type: 'node', id: 'a', position: [12, 24], text: 'hello' };
    const node = compileNode(input, {
      ...context,
      context: prepared.compiled.scope,
      irPath: `${context.irPath}.children[0].node`,
    });
    if (node.status !== 'compiled') throw new Error('expected node');
    const scope = compileScope(scopeInput, prepared.compiled, [node.compiled.layout], context);
    if (scope.status !== 'compiled') throw new Error('expected scope');
    const output = assembleScopeOutput(scope.compiled, [node.compiled.output], environment);
    const assembled = assembleSceneCompilation({}, [output], environment);
    const full = compileToScene({ version: 1, type: 'scene', children: [{ ...scopeInput, children: [input] }] });
    expect(assembled.result.scene).toEqual(full.scene);
  });

  it('资源局部编号在组装时重映射，旧片段保持不变', () => {
    const environment = createCompileEnvironment();
    const context = { environment, context: resolveScopeContext({}, environment), irPath: 'node' };
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
    const output = assembleSceneCompilation({}, [first.compiled.output, second.compiled.output], environment);
    expect(output.result.scene.primitives).toHaveLength(2);
    expect(output.result.scene.resources).toHaveLength(2);
    expect(first.compiled.output.resources[0].id).toBe(second.compiled.output.resources[0].id);
    expect(new Set(output.result.scene.resources?.map(resource => resource.id)).size).toBe(2);
    expect(first.compiled.output).toEqual(before);
  });
  it('未就绪引用返回 pending，不暴露半成品', () => {
    const environment = createCompileEnvironment();
    const binding = {};
    const pending = compileCoordinate(
      { type: 'coordinate', id: 'b', position: { direction: 'right', of: 'a' } },
      {
        environment,
        context: resolveScopeContext({}, environment),
        irPath: 'b',
        namespace: { bindings: new Map([['a', { state: 'pending', binding }]]) },
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
        environment,
        context: resolveScopeContext({}, environment),
        irPath: 'path',
        namespace: { bindings: new Map([['a', { state: 'pending', binding }]]) },
      },
    );
    expect(pendingPath.status).toBe('pending');
    expect(pendingPath).not.toHaveProperty('compiled');
    expect(pending.status).toBe('pending');
    expect(pending.reads[0]).toMatchObject({ name: 'a', state: 'pending', binding });
    expect(pending).not.toHaveProperty('compiled');
    expect(pending).not.toHaveProperty('diagnostics');
  });

  it('独立 Path 与全量路径生成相同输出', () => {
    const environment = createCompileEnvironment();
    const input = {
      type: 'path' as const,
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [30, 20] as [number, number] },
      ],
    };
    const result = compilePath(input, {
      environment,
      context: resolveScopeContext({}, environment),
      irPath: 'scene.children[0].path',
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
    const environment = createCompileEnvironment();
    const result = compileNode(input, {
      environment,
      context: resolveScopeContext({}, environment),
      irPath: 'scene.children[0].node',
    });
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') return;
    expect(result.compiled.layout.geometry.rect.x).toBe(12);
    expect(result.compiled.layout.geometry.rect.y).toBe(24);
    expect(result.compiled.output.primitives).toEqual(
      compileToScene({ version: 1, type: 'scene', children: [input] }).scene.primitives,
    );
    expect(result.reads).toEqual([]);
  });

  it('Scope 默认样式经同一规则作用于节点', () => {
    const environment = createCompileEnvironment();
    const scope = { defaults: { node: { style: { fill: 'red' } } } };
    const input: IRNode = { type: 'node', position: [0, 0] };
    const result = compileNode(input, {
      environment,
      context: resolveScopeContext(scope, environment),
      irPath: 'scene.children[0].scope.children[0].node',
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
