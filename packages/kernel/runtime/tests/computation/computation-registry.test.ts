import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import type {
  RuntimeCandidateView,
  RuntimeComputationDefinition,
  RuntimeComputationToken,
} from '../../src/computation';
import {
  defineRuntimeComputation,
  getRuntimeComputationDefinitionExecutor,
  RuntimeComputationExecution,
  RuntimeComputationKind,
  RuntimeComputationPhase,
} from '../../src/computation';
import {
  createRuntimeSourceRegistry,
  createRuntimeComputationRegistry,
  sortRuntimeComputationGraph,
} from '../../src/registry';
import type { RuntimeSourceToken, RuntimeRevision } from '../../src/source';
import { defineRuntimeSource } from '../../src/source';
import {
  createRuntimeTraceReporter,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
} from '../../src/trace';

const defineSource = (key: string) =>
  defineRuntimeSource<number, number, number, never>({
    key,
    value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
  });

const defineComputation = (
  source: RuntimeSourceToken,
  id: Readonly<{ owner: string; key: string }>,
  computations: ReadonlyArray<RuntimeComputationToken> = [],
) =>
  defineRuntimeComputation<number, number, number, number>({
    id,
    sources: [source],
    computations,
    tracePhases: [],
    result: { capture: value => value, readForComputation: value => value, read: value => value },
    run: () => ({ kind: RuntimeComputationKind.Full, result: 1 }),
  });

describe('runtime computation definition and registry', () => {
  it('统一注册计算列表，并按拓扑后 owner/key code-unit 顺序返回', () => {
    const owner = defineSource('counter');
    const upperSource = defineSource('Counter');
    const sources = createRuntimeSourceRegistry([owner, upperSource]);
    const a = defineComputation(owner, { owner: 'counter', key: 'a' });
    const upper = defineComputation(upperSource, { owner: 'Counter', key: 'A' });
    const child = defineComputation(owner, { owner: 'counter', key: 'child' }, [a]);
    const registry = createRuntimeComputationRegistry({ sources, computations: [child, a, upper] });

    expect(registry.resolve(a)).toBe(a);
    expect(registry.find({ owner: 'counter', key: 'child' })).toBe(child);
    expect(registry.definitions()).toEqual([upper, a, child]);
    expect(Object.isFrozen(registry.definitions())).toBe(true);
  });

  it.each([
    { id: { owner: '', key: 'x' }, code: RetikzRuntimeErrorCode.ComputationIdInvalid },
    { id: { owner: 'x', key: '' }, code: RetikzRuntimeErrorCode.ComputationIdInvalid },
  ])('拒绝无效 Computation id：$id', ({ id, code }) => {
    const owner = defineSource('counter');

    expect(() => defineComputation(owner, id)).toThrowError(expect.objectContaining({ code }));
  });

  it('复制 Definition 的 id/dependency/trace nested arrays', () => {
    const owner = defineSource('counter');
    const id = { owner: 'counter', key: 'stable' };
    const sources: Array<RuntimeSourceToken> = [owner];
    const computations: Array<RuntimeComputationToken> = [];
    const outcomes: Array<PerformanceTraceOutcome> = [PerformanceTraceOutcome.Full];
    const tracePhases = [
      {
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.Computation,
        outcomes,
      },
    ];
    const result = {
      capture: (value: number) => value,
      readForComputation: (value: number) => value,
      read: (value: number) => value,
    };
    const input = {
      id,
      sources,
      computations,
      tracePhases,
      result,
      run: () => ({ kind: RuntimeComputationKind.Full, result: 1 }),
    };
    const definition = defineRuntimeComputation(input);
    const executor = getRuntimeComputationDefinitionExecutor(definition);

    id.owner = 'mutated';
    id.key = 'mutated';
    sources.length = 0;
    computations.push(definition);
    outcomes.push(PerformanceTraceOutcome.Incremental);
    tracePhases.length = 0;
    result.capture = () => 99;
    result.readForComputation = () => 99;
    result.read = () => 99;
    input.run = () => ({ kind: RuntimeComputationKind.Full, result: 99 });
    const view: RuntimeCandidateView = Object.freeze({
      phase: RuntimeComputationPhase.Initial,
      candidateRevision: 0 as RuntimeRevision,
      snapshot: () => {
        throw new Error('unused owner lookup');
      },
      isChanged: () => true,
      changeSet: () => {
        throw new Error('unused change lookup');
      },
      result: () => {
        throw new Error('unused result lookup');
      },
    });

    const registry = createRuntimeComputationRegistry({
      sources: createRuntimeSourceRegistry([owner]),
      computations: [definition],
    });

    expect(registry.definitions()).toEqual([definition]);
    expect(definition.id).toEqual({ owner: 'counter', key: 'stable' });
    expect(executor.sources).toEqual([owner]);
    expect(executor.computations).toEqual([]);
    expect(executor.tracePhases).toEqual([
      {
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.Computation,
        outcomes: [PerformanceTraceOutcome.Full],
      },
    ]);
    expect(executor.capture(1)).toBe(1);
    expect(executor.readForComputation(1)).toBe(1);
    expect(executor.read(1)).toBe(1);
    expect(
      executor.run(view, {
        execution: RuntimeComputationExecution.Full,
        trace: createRuntimeTraceReporter({ owner: 'counter', phases: [], sink: () => undefined }),
        diagnose: () => undefined,
      }),
    ).toEqual({ kind: RuntimeComputationKind.Full, result: 1 });
  });

  it.each([
    {
      tracePhases: [{ phase: PerformanceTracePhase.Update, unit: PerformanceTraceUnit.Computation, outcomes: [] }],
    },
    {
      tracePhases: [
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcomes: [PerformanceTraceOutcome.Full],
        },
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
    },
  ])('拒绝无效 trace declaration', ({ tracePhases }) => {
    const owner = defineSource('counter');

    expect(() =>
      defineRuntimeComputation({
        id: { owner: 'counter', key: 'trace' },
        sources: [owner],
        computations: [],
        tracePhases,
        result: { capture: (value: number) => value, readForComputation: value => value, read: value => value },
        run: () => ({ kind: RuntimeComputationKind.Full, result: 1 }),
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.TraceDefinitionInvalid }));
  });

  it('拒绝 duplicate、unknown owner 与 unknown computation', () => {
    const owner = defineSource('counter');
    const unknownSource = defineSource('unknown');
    const sources = createRuntimeSourceRegistry([owner]);
    const first = defineComputation(owner, { owner: 'counter', key: 'same' });
    const duplicate = defineComputation(owner, { owner: 'counter', key: 'same' });
    const missingSource = defineComputation(unknownSource, { owner: 'unknown', key: 'missing-owner' });
    const missingComputation = defineComputation(owner, { owner: 'counter', key: 'missing-computation' }, [first]);

    expect(() => createRuntimeComputationRegistry({ sources, computations: [first, duplicate] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ComputationDuplicate }),
    );
    expect(() => createRuntimeComputationRegistry({ sources, computations: [missingSource] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Unknown }),
    );
    expect(() => createRuntimeComputationRegistry({ sources, computations: [missingComputation] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ComputationUnknown }),
    );
  });

  it('拒绝 Computation id 指向未注册 owner 与伪造 source registry', () => {
    const owner = defineSource('counter');
    const sources = createRuntimeSourceRegistry([owner]);
    const wrongComputationSource = defineComputation(owner, { owner: 'missing', key: 'computation' });

    expect(() => createRuntimeComputationRegistry({ sources, computations: [wrongComputationSource] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Unknown }),
    );
    expect(() =>
      createRuntimeComputationRegistry({
        sources: {
          definitions: () => [],
          find: () => undefined,
          resolve: definition => definition,
        },
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.RegistryMismatch }));
  });

  it.each(['self', 'cycle'] as const)('防御性 graph validation 拒绝 %s dependency', kind => {
    const owner = defineSource('counter');
    const a = defineComputation(owner, { owner: 'counter', key: 'a' });
    const b = defineComputation(owner, { owner: 'counter', key: 'b' });
    const dependencies =
      kind === 'self'
        ? new Map<RuntimeComputationToken, ReadonlyArray<RuntimeComputationToken>>([
            [a, [a]],
            [b, []],
          ])
        : new Map<RuntimeComputationToken, ReadonlyArray<RuntimeComputationToken>>([
            [a, [b]],
            [b, [a]],
          ]);

    expect(() => sortRuntimeComputationGraph([a, b], definition => dependencies.get(definition) ?? [])).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ComputationCycle }),
    );
  });

  it('拒绝 object literal 与 foreign module Computation token', async () => {
    const owner = defineSource('counter');
    const sources = createRuntimeSourceRegistry([owner]);
    const forged = { id: { owner: 'counter', key: 'forged' } } as RuntimeComputationDefinition<
      number,
      number,
      number,
      number
    >;

    expect(() => createRuntimeComputationRegistry({ sources, computations: [forged] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ComputationTokenInvalid }),
    );

    vi.resetModules();
    const { defineRuntimeComputation: defineForeignComputation } = await import('../../src/computation/define');
    const foreign = defineForeignComputation({
      id: { owner: 'counter', key: 'foreign' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: (value: number) => value, readForComputation: value => value, read: value => value },
      run: () => ({ kind: RuntimeComputationKind.Full, result: 1 }),
    });

    expect(() => createRuntimeComputationRegistry({ sources, computations: [foreign] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ComputationTokenInvalid }),
    );
  });
});
