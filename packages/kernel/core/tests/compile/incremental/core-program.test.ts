import type { PerformanceTraceRecord } from '@retikz/runtime';

import {
  createRuntimeChangeSet,
  createRuntimeIdentity,
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeOwner,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RuntimeProgramKind,
  RuntimeProgramPhase,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  CompileObserverDefinition,
  CompileWarning,
  IRScene,
  RuntimeScenePrimitive,
  ShapeDefinition,
} from '../../../src';

import {
  BUILTIN_SHAPES,
  compileToScene,
  CompositeBaseSchema,
  CORE_OWNER_KEY,
  CORE_PROGRAM_ID,
  CoreOwnerDefinition,
  createCoreProgram,
  defineComposite,
  defineShape,
} from '../../../src';

const sceneWithText = (text: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node-a', position: [0, 0], text }],
});

const primitiveCount = (primitives: ReadonlyArray<RuntimeScenePrimitive>): number =>
  primitives.reduce(
    (count, primitive) => count + 1 + (primitive.type === 'group' ? primitiveCount(primitive.children) : 0),
    0,
  );

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

describe('Core Runtime Program initial full run', () => {
  it('外部失效 owner 变化时即使 Core IR 等价也重新编译', () => {
    const invalidationOwner = defineRuntimeOwner<number, number, number, never>({
      key: 'fixture:core-invalidation',
      value: {
        capture: value => value,
        read: value => value,
        equals: Object.is,
      },
    });
    let measuredWidth = 10;
    const ir = sceneWithText('stable');
    const program = createCoreProgram(
      { measureText: () => ({ width: measuredWidth, height: 10 }) },
      { invalidationOwners: [invalidationOwner] },
    );
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, invalidationOwner] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, ir),
        createRuntimeOwnerInput(invalidationOwner, 0),
      ],
    });
    const initialWidth = session.artifact(program).value.output.result.scene.layout.width;

    measuredWidth = 100;
    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(invalidationOwner, 1)],
    });

    expect(session.artifact(program).value.output.result.scene.layout.width).toBeGreaterThan(initialWidth);
  });

  it('外部失效 owner 与 Core IR 同 revision 变化时强制 full fallback', () => {
    const invalidationOwner = defineRuntimeOwner<number, number, number, never>({
      key: 'fixture:core-invalidation-with-ir-change',
      value: {
        capture: value => value,
        read: value => value,
        equals: Object.is,
      },
    });
    let measuredWidth = 10;
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'changed', position: [0, 0], text: 'A', fill: '#ef4444' },
        { type: 'node', id: 'stable', position: [80, 0], text: 'B', fill: '#ffffff' },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [{ ...initial.children[0], fill: '#22c55e' }, initial.children[1]],
    };
    const measureText = () => ({ width: measuredWidth, height: 10 });
    const program = createCoreProgram({ measureText }, { invalidationOwners: [invalidationOwner] });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, invalidationOwner] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, initial),
        createRuntimeOwnerInput(invalidationOwner, 0),
      ],
    });

    measuredWidth = 100;
    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next), createRuntimeOwnerUpdate(invalidationOwner, 1)],
    });

    const artifact = session.artifact(program).value;
    expect(artifact.output.result.scene).toEqual(compileToScene(next, { measureText }).scene);
    expect(artifact.patch?.operations).toEqual([expect.objectContaining({ kind: 'replaceScene' })]);
  });

  it('forced full 不掩盖 invalid change hint，Core replace 与 trace 仍报告 fallback', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const invalidationOwner = defineRuntimeOwner<number, number, number, number>({
      key: 'fixture:core-invalid-hint',
      value: {
        capture: value => value,
        read: value => value,
        equals: Object.is,
      },
      validateChangeSet: () => 'fallback',
    });
    const program = createCoreProgram({}, { invalidationOwners: [invalidationOwner] });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, invalidationOwner] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      updateStrategy: 'full',
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, sceneWithText('A')),
        createRuntimeOwnerInput(invalidationOwner, 0),
      ],
      trace: record => records.push(record),
    });
    records.length = 0;
    const baseRevision = session.revision();

    const result = session.update({
      baseRevision,
      owners: [createRuntimeOwnerUpdate(invalidationOwner, 1, createRuntimeChangeSet(baseRevision, [1]))],
    });
    const artifact = session.artifact(program).value;

    expect(result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'RUNTIME_CHANGESET_FALLBACK' })]);
    expect(artifact.patch?.operations).toEqual([
      expect.objectContaining({ kind: 'replaceScene', snapshot: artifact.snapshot }),
    ]);
    expect(records.filter(record => record.owner === CORE_OWNER_KEY).map(record => record.outcome)).toEqual([
      PerformanceTraceOutcome.Fallback,
      PerformanceTraceOutcome.Fallback,
    ]);
  });

  it('只修改 Core IR 时不会把未变化的外部失效 owner 误判为 invalidation', () => {
    const invalidationOwner = defineRuntimeOwner<number, number, number, never>({
      key: 'fixture:core-stable-invalidation',
      value: {
        capture: value => value,
        read: value => value,
        equals: Object.is,
      },
    });
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'changed', position: [0, 0], text: 'A', fill: '#ef4444' },
        { type: 'node', id: 'stable', position: [80, 0], text: 'B', fill: '#ffffff' },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [{ ...initial.children[0], fill: '#22c55e' }, initial.children[1]],
    };
    const program = createCoreProgram({}, { invalidationOwners: [invalidationOwner] });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, invalidationOwner] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, initial),
        createRuntimeOwnerInput(invalidationOwner, 0),
      ],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Incremental);
    expect(session.artifact(program).value.patch?.operations).toEqual([expect.objectContaining({ kind: 'update' })]);
  });

  it('保留固定 Program id，并与 compileToScene 的完整结果等价', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'a', position: [0, 0], text: 'A' },
        { type: 'node', id: 'b', position: [80, 0], text: 'B' },
      ],
    };
    const program = createCoreProgram({ padding: 16, onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
    });

    const artifact = session.artifact(program);
    const expected = compileToScene(ir, { padding: 16, onWarn: () => {} });

    expect(program.id).toEqual(CORE_PROGRAM_ID);
    expect(CORE_PROGRAM_ID).toEqual({ owner: CORE_OWNER_KEY, key: 'compile' });
    expect(artifact.revision).toBe(0);
    expect(artifact.value.output.result).toEqual(expected);
    expect(artifact.value.output.diagnostics).toEqual([]);
    expect(Object.isFrozen(artifact.value.output.result.scene)).toBe(true);
    expect(Object.isFrozen(artifact.value.output.result.scene.primitives)).toBe(true);
    expect(artifact.value.snapshot).toMatchObject({
      revision: 0,
      root: { owner: CORE_OWNER_KEY, path: ['root'] },
      scene: {
        ...expected.scene,
        resources: expected.scene.resources ?? [],
        animations: expected.scene.animations ?? [],
      },
    });
    expect(artifact.value.snapshot.topology).toHaveLength(primitiveCount(artifact.value.snapshot.scene.primitives));
    expect(artifact.value.patch).toBeUndefined();
  });

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
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
    });
    const snapshot = session.artifact(program).value.snapshot;
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

  it('创建后修改 options、registry array 与 Definition record 不改变 Program', () => {
    const customShape = defineShape({
      ...BUILTIN_SHAPES.rectangle,
      name: 'isolated-rectangle',
    });
    const shapes: Array<ShapeDefinition> = [customShape];
    const options = { padding: 12, shapes, onWarn: () => {} };
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'a',
          position: [0, 0],
          text: 'A',
          shape: 'isolated-rectangle',
        },
      ],
    };
    const expected = compileToScene(ir, options);
    const program = createCoreProgram(options);

    options.padding = 99;
    shapes.length = 0;
    customShape.emit = () => {
      throw new Error('mutated Definition must not be observed');
    };

    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
    });

    expect(session.artifact(program).value.output.result).toEqual(expected);
  });

  it('隔离带自定义 prototype 的 Definition record 后续修改', () => {
    const customPrototype = Object.freeze({ source: 'custom-prototype' });
    const customShape = Object.assign(Object.create(customPrototype) as ShapeDefinition, {
      ...BUILTIN_SHAPES.rectangle,
      name: 'prototype-rectangle',
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'a',
          position: [0, 0],
          text: 'A',
          shape: 'prototype-rectangle',
        },
      ],
    };
    const expected = compileToScene(ir, { shapes: [customShape], onWarn: () => {} });
    const program = createCoreProgram({ shapes: [customShape], onWarn: () => {} });

    customShape.emit = () => {
      throw new Error('mutated prototype Definition must not be observed');
    };

    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
    });

    expect(session.artifact(program).value.output.result).toEqual(expected);
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
    const program = createCoreProgram({ onWarn: warning => observedWarnings.push(warning) });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
    });

    expect(session.artifact(program).value.output.result).toEqual(expected);
    expect(session.artifact(program).value.output.diagnostics).toEqual(expectedWarnings);
    expect(observedWarnings).toEqual(expectedWarnings);
  });

  it('Program candidate 失败时不派发已经收集的 warning', () => {
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
    const program = createCoreProgram({ onWarn: warning => observedWarnings.push(warning) });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
      }),
    ).toThrow();
    expect(observedWarnings).toEqual([]);
  });

  it('initial full run 只报告一条 Program owner 的 ir-child trace', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'a', position: [0, 0], text: 'A' },
        { type: 'node', id: 'b', position: [80, 0], text: 'B' },
      ],
    };
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
      trace: record => records.push(record),
    });

    expect(records).toEqual([
      {
        owner: CORE_OWNER_KEY,
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.IrChild,
        outcome: PerformanceTraceOutcome.Full,
        visited: 2,
        reused: 0,
        changed: 2,
      },
    ]);
  });
});

describe('Core Runtime Program observed output', () => {
  const observedComposite = defineComposite({
    namespace: 'test',
    type: 'program-observed',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('program-observed'),
      label: z.string(),
    }),
    artifactSchema: z.strictObject({ label: z.string() }),
    compile: node => ({
      artifact: { label: node.label },
      children: [{ type: 'node', position: [0, 0], text: node.label }],
    }),
  });

  const sourceWithLabel = (label: string): IRScene => ({
    version: 1,
    type: 'scene',
    children: [{ namespace: 'test', type: 'program-observed', label }],
  });

  const observer: CompileObserverDefinition = {
    key: 'program-observer',
    createSession: () => {
      const labels: Array<string> = [];
      return {
        select: site => site.owner.kind === 'composite',
        observe: observation => {
          const value = observation.value as { label: string };
          labels.push(value.label);
        },
        complete: () => labels,
      };
    },
  };

  it('commits primary and observer outputs from one full candidate revision', () => {
    const program = createCoreProgram({ composites: [observedComposite], onWarn: () => {} }, { observers: [observer] });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, sourceWithLabel('A'))],
    });
    const before = session.artifact(program).value;
    const baseRevision = session.revision();

    const update = session.update({
      baseRevision,
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, sourceWithLabel('B'))],
    });
    const after = session.artifact(program).value;

    expect(update.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(after.output.observerOutputs).toEqual([{ key: 'program-observer', value: ['B'] }]);
    expect(after.output.result.scene).toEqual(
      compileToScene(sourceWithLabel('B'), { composites: [observedComposite], onWarn: () => {} }).scene,
    );
    expect(after.snapshot.revision).toBe(session.revision());
    expect(after.patch?.nextRevision).toBe(after.snapshot.revision);
    expect(after.output.result).not.toBe(before.output.result);
  });

  it('rolls back the whole candidate when observer completion fails', () => {
    let shouldFail = false;
    const failingObserver: CompileObserverDefinition = {
      key: 'failing-program-observer',
      createSession: () => ({
        select: () => false,
        observe: () => undefined,
        complete: () => {
          if (shouldFail) throw new Error('observer completion failed');
          return null;
        },
      }),
    };
    const program = createCoreProgram(
      { composites: [observedComposite], onWarn: () => {} },
      { observers: [failingObserver] },
    );
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, sourceWithLabel('A'))],
    });
    const before = session.artifact(program).value;
    const baseRevision = session.revision();
    shouldFail = true;

    expect(() =>
      session.update({
        baseRevision,
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, sourceWithLabel('B'))],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_RUN_FAILED',
        cause: expect.objectContaining({ message: 'observer completion failed' }),
      }),
    );
    expect(session.revision()).toBe(baseRevision);
    expect(session.artifact(program).value).toBe(before);
  });

  it('keeps the existing incremental path when observers are empty', () => {
    const program = createCoreProgram({ onWarn: () => {} }, { observers: [] });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const initial = sceneWithText('A');
    const next: IRScene = { ...initial, children: [{ ...initial.children[0], fill: '#22c55e' }] };
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Incremental);
    expect(session.artifact(program).value.output.observerOutputs).toEqual([]);
  });
});

describe('Core Runtime Program full fallback update', () => {
  it('unique id 前插与 reorder 后保持 owner 和 primitive identity，并发布独占 replaceScene Patch', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const initial = sceneWithText('A');
    initial.children.push({ type: 'node', id: 'node-b', position: [80, 0], text: 'B' });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
      trace: record => records.push(record),
    });
    const before = session.artifact(program).value.snapshot.topology;
    records.length = 0;

    const next: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'node-c', position: [160, 0], text: 'C' },
        { type: 'node', id: 'node-b', position: [80, 0], text: 'B' },
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
      ],
    };
    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });
    const after = session.artifact(program).value;
    const stableIdentityKeys = (topology: typeof before, publicId: string): Array<string> =>
      topology
        .filter(node => node.semanticOwner.path.at(-1) === publicId)
        .map(node => identityKey(node.identity))
        .sort();

    expect(result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(after.output.result).toEqual(compileToScene(next, { onWarn: () => {} }));
    expect(stableIdentityKeys(after.snapshot.topology, 'node-a')).toEqual(stableIdentityKeys(before, 'node-a'));
    expect(stableIdentityKeys(after.snapshot.topology, 'node-b')).toEqual(stableIdentityKeys(before, 'node-b'));
    expect(after.patch).toEqual({
      baseRevision: 0,
      nextRevision: 1,
      operations: [{ kind: 'replaceScene', snapshot: after.snapshot }],
    });
    expect(records).toEqual([
      {
        owner: CORE_OWNER_KEY,
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.IrChild,
        outcome: PerformanceTraceOutcome.Fallback,
        visited: 3,
        reused: 0,
        changed: 3,
      },
      {
        owner: CORE_OWNER_KEY,
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.SceneChange,
        outcome: PerformanceTraceOutcome.Fallback,
        visited: 1,
        reused: 0,
        changed: 1,
      },
    ]);
  });

  it('anonymous 与 duplicate id 只获得 candidate-local owner identity', () => {
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const source: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'duplicate', position: [0, 0], text: 'A' },
        { type: 'node', id: 'duplicate', position: [80, 0], text: 'B' },
        { type: 'node', position: [160, 0], text: 'C' },
      ],
    };
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, source)],
    });
    const ownersAtRevision0 = session.artifact(program).value.snapshot.topology.map(node => node.semanticOwner);

    expect(ownersAtRevision0.every(identity => identity.path.includes('candidate'))).toBe(true);
    expect(ownersAtRevision0.some(identity => identity.path.join('/') === 'root/node/duplicate')).toBe(false);
  });

  it('接受与前后 Snapshot 一致的 update hint，且缺少 hint 时不误报 mismatch', () => {
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, sceneWithText('A'))],
    });
    const nodeIdentity = createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', 'node-a']);
    const baseRevision = session.revision();

    const hinted = session.update({
      baseRevision,
      owners: [
        createRuntimeOwnerUpdate(
          CoreOwnerDefinition,
          sceneWithText('B'),
          createRuntimeChangeSet(baseRevision, [{ kind: 'update', identity: nodeIdentity }]),
        ),
      ],
    });
    const snapshotOnly = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, sceneWithText('C'))],
    });

    expect(hinted.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(hinted.diagnostics).toEqual([]);
    expect(snapshotOnly.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(snapshotOnly.diagnostics).toEqual([]);
  });

  it('hint 指向错误 identity 或漏掉真实变化时只提交一条 mismatch diagnostic', () => {
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
        { type: 'node', id: 'node-b', position: [80, 0], text: 'B' },
      ],
    };
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
    });
    const next: IRScene = {
      ...initial,
      children: [
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A2' },
        { type: 'node', id: 'node-b', position: [80, 0], text: 'B2' },
      ],
    };
    const baseRevision = session.revision();
    const result = session.update({
      baseRevision,
      owners: [
        createRuntimeOwnerUpdate(
          CoreOwnerDefinition,
          next,
          createRuntimeChangeSet(baseRevision, [
            {
              kind: 'update',
              identity: createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', 'node-a']),
            },
          ]),
        ),
      ],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(result.diagnostics).toEqual([
      {
        code: 'CORE_CHANGESET_MISMATCH',
        phase: RuntimeProgramPhase.Update,
        severity: 'warning',
        message: 'Core ChangeSet does not match the previous and next canonical Snapshots; using full fallback',
        owner: CORE_OWNER_KEY,
        program: CORE_PROGRAM_ID,
      },
    ]);
    expect(session.diagnostics()).toEqual(result.diagnostics);
  });

  it('实体同时重排与更新时不把 update hints 误判为完整 change set', () => {
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
        { type: 'node', id: 'node-b', position: [80, 0], text: 'B' },
      ],
    };
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
    });
    const baseRevision = session.revision();
    const result = session.update({
      baseRevision,
      owners: [
        createRuntimeOwnerUpdate(
          CoreOwnerDefinition,
          {
            ...initial,
            children: [
              { type: 'node', id: 'node-b', position: [80, 0], text: 'B2' },
              { type: 'node', id: 'node-a', position: [0, 0], text: 'A2' },
            ],
          },
          createRuntimeChangeSet(baseRevision, [
            {
              kind: 'update',
              identity: createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', 'node-a']),
            },
            {
              kind: 'update',
              identity: createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', 'node-b']),
            },
          ]),
        ),
      ],
    });

    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'CORE_CHANGESET_MISMATCH' })]);
  });

  it.each([
    {
      name: 'viewBox',
      rootChange: { viewBox: { x: 0, y: 0, width: 160, height: 90 } },
    },
    {
      name: 'animations',
      rootChange: {
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
      },
    },
  ] satisfies Array<{ name: string; rootChange: Partial<IRScene> }>)(
    '仅修改 Scene 根 $name 时拒绝空 change hint',
    ({ rootChange }) => {
      const program = createCoreProgram({ onWarn: () => {} });
      const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
      const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
      const initial = sceneWithText('A');
      const session = createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
      });
      const baseRevision = session.revision();

      const result = session.update({
        baseRevision,
        owners: [
          createRuntimeOwnerUpdate(
            CoreOwnerDefinition,
            { ...initial, ...rootChange },
            createRuntimeChangeSet(baseRevision, []),
          ),
        ],
      });

      expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'CORE_CHANGESET_MISMATCH' })]);
    },
  );

  it('Scene 根与 child 同时变化时拒绝只覆盖 child 的 update hint', () => {
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const initial = sceneWithText('A');
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
    });
    const baseRevision = session.revision();

    const result = session.update({
      baseRevision,
      owners: [
        createRuntimeOwnerUpdate(
          CoreOwnerDefinition,
          {
            ...sceneWithText('B'),
            viewBox: { x: 0, y: 0, width: 160, height: 90 },
          },
          createRuntimeChangeSet(baseRevision, [
            {
              kind: 'update',
              identity: createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', 'node-a']),
            },
          ]),
        ),
      ],
    });

    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'CORE_CHANGESET_MISMATCH' })]);
  });

  it('mismatch 后 full fallback 失败时不发布 diagnostic 或替换 committed artifact', () => {
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, sceneWithText('A'))],
    });
    const before = session.artifact(program);
    const baseRevision = session.revision();
    const broken: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'node-a', position: [0, 0], text: 'B', shape: 'missing-shape' }],
    };

    expect(() =>
      session.update({
        baseRevision,
        owners: [
          createRuntimeOwnerUpdate(
            CoreOwnerDefinition,
            broken,
            createRuntimeChangeSet(baseRevision, [
              {
                kind: 'update',
                identity: createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', 'missing']),
              },
            ]),
          ),
        ],
      }),
    ).toThrow();
    expect(session.revision()).toBe(baseRevision);
    expect(session.artifact(program).value).toBe(before.value);
    expect(session.diagnostics()).toEqual([]);
  });
});

describe('Core Runtime Program incremental style update', () => {
  it('只重编单个 stable root Node，并发布原子 primitive update Patch', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'a', position: [0, 0], text: 'A', fill: '#ef4444' },
        { type: 'node', id: 'b', position: [80, 0], text: 'B', fill: '#3b82f6' },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A', fill: '#22c55e' }, initial.children[1]],
    };
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
      trace: record => records.push(record),
    });
    const before = session.artifact(program).value.snapshot;
    const baseRevision = session.revision();
    records.length = 0;

    const result = session.update({
      baseRevision,
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });
    const after = session.artifact(program).value;

    expect(result.outcome).toBe(RuntimeProgramKind.Incremental);
    expect(after.output.result).toEqual(compileToScene(next, { onWarn: () => {} }));
    expect(after.patch?.operations).toHaveLength(1);
    const operation = after.patch?.operations[0];
    expect(operation).toMatchObject({ kind: 'update' });
    if (operation?.kind !== 'update') throw new Error('expected one update operation');
    expect(operation.identity.path).toEqual(['root', 'node', 'a', 'emission', 'node:group', '0']);
    expect(operation.subtree.root).toEqual(operation.identity);
    expect(operation.subtree.topology.map(node => node.primitivePath)).toEqual([[], [0], [1]]);
    expect(after.snapshot.scene.primitives[1]).toBe(before.scene.primitives[1]);
    expect(records).toEqual([
      {
        owner: CORE_OWNER_KEY,
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.IrChild,
        outcome: PerformanceTraceOutcome.Incremental,
        visited: 2,
        reused: 1,
        changed: 1,
      },
      {
        owner: CORE_OWNER_KEY,
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.SceneChange,
        outcome: PerformanceTraceOutcome.Incremental,
        visited: 1,
        reused: 0,
        changed: 1,
      },
    ]);
  });

  it('forced full 跳过局部编译并发布独占 replaceScene Patch 与 full trace', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'a', position: [0, 0], text: 'A', fill: '#ef4444' },
        { type: 'node', id: 'b', position: [80, 0], text: 'B', fill: '#3b82f6' },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [{ ...initial.children[0], fill: '#22c55e' }, initial.children[1]],
    };
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      updateStrategy: 'full',
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
      trace: record => records.push(record),
    });
    records.length = 0;

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });
    const after = session.artifact(program).value;

    expect(result.outcome).toBe(RuntimeProgramKind.Full);
    expect(after.output.result).toEqual(compileToScene(next, { onWarn: () => {} }));
    expect(after.patch?.operations).toEqual([
      expect.objectContaining({ kind: 'replaceScene', snapshot: after.snapshot }),
    ]);
    expect(records).toEqual([
      {
        owner: CORE_OWNER_KEY,
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.IrChild,
        outcome: PerformanceTraceOutcome.Full,
        visited: 2,
        reused: 0,
        changed: 2,
      },
      {
        owner: CORE_OWNER_KEY,
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.SceneChange,
        outcome: PerformanceTraceOutcome.Full,
        visited: 1,
        reused: 0,
        changed: 1,
      },
    ]);
  });

  it('root Node 存在引用 position 时保守 full fallback', () => {
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'a', position: [0, 0], text: 'A', fill: '#ef4444' },
        { type: 'node', id: 'b', position: { kind: 'anchor', target: { id: 'a' } }, text: 'B' },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [{ ...initial.children[0], fill: '#22c55e' }, initial.children[1]],
    };
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(session.artifact(program).value.output.result).toEqual(compileToScene(next, { onWarn: () => {} }));

    const changedReferenceNode: IRScene = {
      ...next,
      children: [next.children[0], { ...next.children[1], fill: '#22c55e' }],
    };
    const changedReferenceResult = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, changedReferenceNode)],
    });
    expect(changedReferenceResult.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(session.artifact(program).value.output.result).toEqual(
      compileToScene(changedReferenceNode, { onWarn: () => {} }),
    );
  });

  it('自定义 ShapeDefinition 可读取 fill 时保守 full fallback', () => {
    const fillSensitiveShape = defineShape({
      ...BUILTIN_SHAPES.rectangle,
      name: 'fill-sensitive',
      *emit(rect, style, round, params) {
        yield* BUILTIN_SHAPES.rectangle.emit(
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
          fill: '#ef4444',
        },
      ],
    };
    const next: IRScene = { ...initial, children: [{ ...initial.children[0], fill: '#22c55e' }] };
    const options = { shapes: [fillSensitiveShape], onWarn: () => {} } as const;
    const program = createCoreProgram(options);
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(session.artifact(program).value.output.result).toEqual(compileToScene(next, options));
  });
});
