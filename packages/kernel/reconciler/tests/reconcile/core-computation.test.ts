import type { CompileWarning, IRScene } from '@retikz/core';
import { BUILTIN_SHAPES, compileToScene, CompositeBaseSchema, defineComposite, defineShape } from '@retikz/core';
import type { ReconcilerResult, RuntimeScenePrimitive } from '@retikz/reconciler';
import { createFullSceneRuntimeSnapshot, ReconcilerSession } from '@retikz/reconciler';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

const sceneWithText = (text: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node-a', position: [0, 0], text }],
});

const identityKey = (identity: { owner: string; path: ReadonlyArray<string> }): string =>
  `${identity.owner}:${identity.path.join('/')}`;

const primitivePaths = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  prefix: ReadonlyArray<number> = [],
): Array<ReadonlyArray<number>> => {
  const paths: Array<ReadonlyArray<number>> = [];
  primitives.forEach((primitive, index) => {
    const path = [...prefix, index];
    paths.push(path);
    if (primitive.type === 'group') paths.push(...primitivePaths(primitive.children, path));
  });

  return paths;
};

describe('Core Runtime 计算初始完整运行', () => {
  it('为 topology 建立 primitive 双射、真实 semantic owner 与稳定 emission identity', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
        {
          type: 'scope',
          id: 'scope-a',
          children: [{ type: 'node', id: 'node-b', position: [80, 0], text: 'B' }],
        },
        {
          type: 'path',
          id: 'path-a',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [80, 0] },
          ],
        },
      ],
    };
    const session = new ReconcilerSession({ onWarn: () => {} }, { captureProvenance: true });

    session.mount(ir);
    const snapshot = snapshotOf(session.read());
    const topologyIdentityKeys = snapshot.topology.map(node => identityKey(node.identity));
    const topologyByPath = new Map(snapshot.topology.map(node => [node.primitivePath.join('.'), node]));
    const topologyPaths = snapshot.topology.map(node => node.primitivePath.join('.')).sort();
    const expectedPaths = primitivePaths(snapshot.scene.primitives)
      .map(path => path.join('.'))
      .sort();
    const semanticOwnerPaths = new Set(snapshot.topology.map(node => node.semanticOwner.path.join('/')));

    expect(new Set(topologyIdentityKeys).size).toBe(topologyIdentityKeys.length);
    expect(topologyPaths).toEqual(expectedPaths);
    expect(semanticOwnerPaths).toContain('root/node/node-a');
    expect(semanticOwnerPaths).toContain('root/scope/scope-a');
    expect(semanticOwnerPaths).toContain('root/scope/scope-a/node/node-b');
    expect(semanticOwnerPaths).toContain('root/path/path-a');

    for (const node of snapshot.topology) {
      expect(node.identity.path.slice(0, node.semanticOwner.path.length)).toEqual(node.semanticOwner.path);
      expect(node.identity.path[node.semanticOwner.path.length]).toBe('emission');

      const parentPath = node.primitivePath.slice(0, -1).join('.');
      const parentNode = topologyByPath.get(parentPath);
      let expectedParent = snapshot.root;
      if (node.primitivePath.length > 1 && parentNode === undefined) {
        throw new Error(`missing topology parent at ${parentPath}`);
      }

      if (node.primitivePath.length > 1 && parentNode !== undefined) expectedParent = parentNode.identity;

      expect(identityKey(node.parent)).toBe(identityKey(expectedParent));
      expect(node.order).toBe(node.primitivePath.at(-1));
    }
  });

  it('在 initial commit 后按 canonical 顺序派发 warning，并保存等价 diagnostics', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] }],
    };
    const expectedWarnings: Array<CompileWarning> = [];
    const expected = compileToScene(ir, { onWarn: warning => expectedWarnings.push(warning) });
    const observedWarnings: Array<CompileWarning> = [];
    const session = new ReconcilerSession({ onWarn: warning => observedWarnings.push(warning) });

    session.mount(ir);

    expect(session.read().compilation.result).toEqual(expected);
    expect(session.read().compilation.diagnostics).toEqual(expectedWarnings);
    expect(observedWarnings).toEqual(expectedWarnings);
  });

  it('Computation candidate 失败时不派发已经收集的 warning', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'duplicate', position: [0, 0], text: 'A' },
        { type: 'node', id: 'duplicate', position: [80, 0], text: 'B' },
        { type: 'node', id: 'broken', position: [160, 0], text: 'C', shape: 'missing-shape' },
      ],
    };
    const observedWarnings: Array<CompileWarning> = [];
    const session = new ReconcilerSession({ onWarn: warning => observedWarnings.push(warning) });

    expect(() => session.mount(ir)).toThrow();
    expect(observedWarnings).toEqual([]);
  });
});

describe('Core Runtime 领域产物事务', () => {
  const definition = defineComposite({
    namespace: 'test',
    type: 'artifact',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('artifact'), label: string() }),
    artifactSchema: strictObject({ label: string() }),
    compile: node => {
      if (node.label === 'fail') throw new Error('domain compilation failed');
      return { artifact: { label: node.label }, children: [{ type: 'node', text: node.label }] };
    },
  });
  const source = (label: string): IRScene => ({
    version: 1,
    type: 'scene',
    children: [{ namespace: 'test', type: 'artifact', label }],
  });
  it('Scene 和领域产物同次提交，失败保留上一 revision', () => {
    const session = new ReconcilerSession({ composites: [definition] });
    session.mount(source('A'));
    const before = session.read();
    session.replace(source('B'));
    const after = session.read();
    expect(after.compilation.result).toEqual(compileToScene(source('B'), { composites: [definition] }));
    expect(after.compilation.result.artifacts[0].value).toEqual({ label: 'B' });
    expect(before.compilation.result.artifacts[0].value).toEqual({ label: 'A' });
    expect(after.revision).not.toBe(before.revision);
    expect(() => session.replace(source('fail'))).toThrow();
    expect(session.read()).toBe(after);
  });
});

describe('Core Runtime 计算完整回退更新', () => {
  it('完整输入替换同时更新根配置与子元素', () => {
    const session = new ReconcilerSession({ onWarn: () => {} }, { captureProvenance: true });

    session.mount(sceneWithText('A'));
    const next: IRScene = {
      ...sceneWithText('B'),
      viewBox: { x: 0, y: 0, width: 160, height: 90 },
      animations: [
        {
          property: 'viewBox',
          keyframes: [
            { at: 0, value: [0, 0, 160, 90] },
            { at: 1, value: [10, 10, 120, 70] },
          ],
          duration: 400,
        },
      ],
    };
    session.replace(next);

    expect(session.read().compilation.diagnostics).toEqual([]);
    expect(session.read().compilation.result).toEqual(compileToScene(next, { onWarn: () => {} }));
  });

  it('完整输入编译失败时不发布诊断或替换已提交结果', () => {
    const session = new ReconcilerSession({ onWarn: () => {} }, { captureProvenance: true });

    session.mount(sceneWithText('A'));
    const before = session.read();
    const baseRevision = session.read().revision;
    const broken: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'node-a', position: [0, 0], text: 'B', shape: 'missing-shape' }],
    };

    expect(() => session.replace(broken)).toThrow();
    expect(session.read().revision).toBe(baseRevision);
    expect(session.read()).toBe(before);
    expect(session.diagnostics()).toEqual([]);
  });
});

describe('Core Runtime 计算替换样式更新', () => {
  it('填充与其它样式同时变化时保留完整输出', () => {
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'a', position: [0, 0], style: { fill: 'red', stroke: 'black' } }],
    };
    const next: IRScene = {
      ...initial,
      children: [{ type: 'node', id: 'a', position: [0, 0], style: { fill: 'blue', stroke: 'green', strokeWidth: 4 } }],
    };
    const session = new ReconcilerSession({ onWarn: () => {} }, { captureProvenance: true });

    session.mount(initial);
    session.replace(next);

    expect(session.read().compilation.result).toEqual(compileToScene(next, { onWarn: () => {} }));
  });

  it('root Node 存在引用 position 时保守 full fallback', () => {
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'a',
          position: [0, 0],
          text: 'A',
          style: { fill: '#ef4444' },
        },
        { type: 'node', id: 'b', position: { kind: 'anchor', target: { id: 'a' } }, text: 'B' },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [{ ...initial.children[0], style: { fill: '#22c55e' } }, initial.children[1]],
    };
    const session = new ReconcilerSession({ onWarn: () => {} }, { captureProvenance: true });

    session.mount(initial);

    session.replace(next);

    expect(session.read().compilation.result).toEqual(compileToScene(next, { onWarn: () => {} }));

    const changedReferenceNode: IRScene = {
      ...next,
      children: [next.children[0], { ...next.children[1], fill: '#22c55e' }],
    };
    session.replace(changedReferenceNode);

    expect(session.read().compilation.result).toEqual(compileToScene(changedReferenceNode, { onWarn: () => {} }));
  });

  it('自定义 ShapeDefinition 可读取 fill 时保守 full fallback', () => {
    const fillSensitiveShape = defineShape({
      ...BUILTIN_SHAPES.get('rectangle')!,
      name: 'fill-sensitive',
      *emit(rect, style, round, params) {
        yield* BUILTIN_SHAPES.get('rectangle')!.emit(
          { ...rect, width: style.fill === '#22c55e' ? rect.width * 2 : rect.width },
          style,
          round,
          params,
        );
      },
    });
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'a',
          shape: 'fill-sensitive',
          position: [0, 0],
          text: 'A',
          style: { fill: '#ef4444' },
        },
      ],
    };
    const next: IRScene = { ...initial, children: [{ ...initial.children[0], style: { fill: '#22c55e' } }] };
    const options = { shapes: [fillSensitiveShape], onWarn: () => {} } as const;
    const session = new ReconcilerSession(options, { captureProvenance: true });

    session.mount(initial);

    session.replace(next);

    expect(session.read().compilation.result).toEqual(compileToScene(next, options));
  });
});

it('Scope 子内容更新、资源撤销和匿名组删除与全量编译等价', () => {
  const session = new ReconcilerSession({});

  const initial: IRScene = { version: 1, type: 'scene', children: [] };
  session.mount(initial);
  const states: Array<IRScene> = [
    {
      ...initial,
      children: [
        {
          type: 'scope',
          children: [
            { type: 'node', position: [0, 0], text: 'A', style: { fill: { kind: 'pattern', shape: 'dots' } } },
          ],
        },
      ],
    },
    {
      ...initial,
      children: [
        {
          type: 'scope',
          children: [{ type: 'node', position: [80, 0], text: 'B' }],
        },
      ],
    },
    { ...initial, children: [{ type: 'scope', children: [{ type: 'node', position: [80, 0], text: 'B' }] }] },
    initial,
  ];

  for (const ir of states) {
    session.replace(ir);

    expect(session.read().compilation.result.scene).toEqual(compileToScene(ir).scene);
  }
});

it('宿主提交失败保留旧编译结果，重试发布完整新树', () => {
  let failing = false;
  const session = new ReconcilerSession(
    { onWarn: () => {} },
    {
      target: {
        prepare: () => ({
          commit: () => {
            if (failing) throw new Error('publication failed');
          },
          rollback: () => undefined,
          dispose: () => undefined,
        }),
      },
    },
  );
  const previous = session.mount(sceneWithText('before'));
  failing = true;
  expect(() => session.replace(sceneWithText('after'))).toThrow();
  expect(session.read()).toBe(previous);
  failing = false;
  expect(session.replace(sceneWithText('after')).compilation.result).toEqual(compileToScene(sceneWithText('after')));
  session.dispose();
});

/** 从本次已捕获的编译来源生成渲染快照，计算会话不默认持有此投影 */
const snapshotOf = (result: ReconcilerResult) =>
  createFullSceneRuntimeSnapshot(result.compilation.result.scene, result.revision, result.compilation.provenance!);
