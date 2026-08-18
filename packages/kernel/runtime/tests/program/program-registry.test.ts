import { describe, expect, it, vi } from 'vitest';

import type { RuntimeOwnerToken, RuntimeRevision } from '../../src/owner';
import type { RuntimeCandidateView, RuntimeProgramDefinition, RuntimeProgramToken } from '../../src/program';
import type { PerformanceTraceOutcomeValue } from '../../src/trace';

import { RetikzRuntimeErrorCode } from '../../src';
import { defineRuntimeOwner } from '../../src/owner';
import {
  defineRuntimeProgram,
  getRuntimeProgramDefinitionExecutor,
  RuntimeProgramExecution,
  RuntimeProgramKind,
  RuntimeProgramPhase,
} from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry, sortRuntimeProgramGraph } from '../../src/registry';
import {
  createRuntimeTraceReporter,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
} from '../../src/trace';

const defineOwner = (key: string) =>
  defineRuntimeOwner<number, number, number, never>({
    key,
    value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
  });

const defineProgram = (
  owner: RuntimeOwnerToken,
  id: Readonly<{ owner: string; key: string }>,
  programs: ReadonlyArray<RuntimeProgramToken> = [],
) =>
  defineRuntimeProgram<number, number, number, number>({
    id,
    owners: [owner],
    programs,
    tracePhases: [],
    artifact: { capture: value => value, readForProgram: value => value, read: value => value },
    run: () => ({ kind: RuntimeProgramKind.Full, artifact: 1 }),
  });

describe('runtime program definition and registry', () => {
  it('统一合并 builtin/custom，并按拓扑后 owner/key code-unit 顺序返回', () => {
    const owner = defineOwner('counter');
    const upperOwner = defineOwner('Counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner, upperOwner] });
    const a = defineProgram(owner, { owner: 'counter', key: 'a' });
    const upper = defineProgram(upperOwner, { owner: 'Counter', key: 'A' });
    const child = defineProgram(owner, { owner: 'counter', key: 'child' }, [a]);
    const registry = createRuntimeProgramRegistry({ owners, builtins: [child], custom: [a, upper] });

    expect(registry.resolve(a)).toBe(a);
    expect(registry.find({ owner: 'counter', key: 'child' })).toBe(child);
    expect(registry.definitions()).toEqual([upper, a, child]);
    expect(Object.isFrozen(registry.definitions())).toBe(true);
  });

  it.each([
    { id: { owner: '', key: 'x' }, code: RetikzRuntimeErrorCode.ProgramIdInvalid },
    { id: { owner: 'x', key: '' }, code: RetikzRuntimeErrorCode.ProgramIdInvalid },
  ])('拒绝无效 Program id：$id', ({ id, code }) => {
    const owner = defineOwner('counter');
    expect(() => defineProgram(owner, id)).toThrowError(expect.objectContaining({ code }));
  });

  it('复制 Definition 的 id/dependency/trace nested arrays', () => {
    const owner = defineOwner('counter');
    const id = { owner: 'counter', key: 'stable' };
    const owners: Array<RuntimeOwnerToken> = [owner];
    const programs: Array<RuntimeProgramToken> = [];
    const outcomes: Array<PerformanceTraceOutcomeValue> = [PerformanceTraceOutcome.Full];
    const tracePhases = [
      {
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.Program,
        outcomes,
      },
    ];
    const artifact = {
      capture: (value: number) => value,
      readForProgram: (value: number) => value,
      read: (value: number) => value,
    };
    const input = {
      id,
      owners,
      programs,
      tracePhases,
      artifact,
      run: () => ({ kind: RuntimeProgramKind.Full, artifact: 1 }),
    };
    const definition = defineRuntimeProgram(input);
    const executor = getRuntimeProgramDefinitionExecutor(definition);

    id.owner = 'mutated';
    id.key = 'mutated';
    owners.length = 0;
    programs.push(definition);
    outcomes.push(PerformanceTraceOutcome.Incremental);
    tracePhases.length = 0;
    artifact.capture = () => 99;
    artifact.readForProgram = () => 99;
    artifact.read = () => 99;
    input.run = () => ({ kind: RuntimeProgramKind.Full, artifact: 99 });
    const view: RuntimeCandidateView = Object.freeze({
      phase: RuntimeProgramPhase.Initial,
      candidateRevision: 0 as RuntimeRevision,
      snapshot: () => {
        throw new Error('unused owner lookup');
      },
      changed: () => true,
      changeSet: () => {
        throw new Error('unused change lookup');
      },
      artifact: () => {
        throw new Error('unused artifact lookup');
      },
    });

    const registry = createRuntimeProgramRegistry({
      owners: createRuntimeOwnerRegistry({ builtins: [owner] }),
      builtins: [definition],
    });
    expect(registry.definitions()).toEqual([definition]);
    expect(definition.id).toEqual({ owner: 'counter', key: 'stable' });
    expect(executor.owners).toEqual([owner]);
    expect(executor.programs).toEqual([]);
    expect(executor.tracePhases).toEqual([
      {
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.Program,
        outcomes: [PerformanceTraceOutcome.Full],
      },
    ]);
    expect(executor.capture(1)).toBe(1);
    expect(executor.readForProgram(1)).toBe(1);
    expect(executor.read(1)).toBe(1);
    expect(
      executor.run(view, {
        execution: RuntimeProgramExecution.Full,
        trace: createRuntimeTraceReporter({ owner: 'counter', phases: [], sink: () => undefined }),
        diagnose: () => undefined,
      }),
    ).toEqual({ kind: RuntimeProgramKind.Full, artifact: 1 });
  });

  it.each([
    {
      tracePhases: [{ phase: PerformanceTracePhase.Update, unit: PerformanceTraceUnit.Program, outcomes: [] }],
      code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
    },
    {
      tracePhases: [{ phase: 'invalid', unit: PerformanceTraceUnit.Program, outcomes: [PerformanceTraceOutcome.Full] }],
      code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
    },
    {
      tracePhases: [{ phase: PerformanceTracePhase.Update, unit: 'invalid', outcomes: [PerformanceTraceOutcome.Full] }],
      code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
    },
    {
      tracePhases: [{ phase: PerformanceTracePhase.Update, unit: PerformanceTraceUnit.Program, outcomes: ['invalid'] }],
      code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
    },
    {
      tracePhases: [
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Program,
          outcomes: [PerformanceTraceOutcome.Full],
        },
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Program,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
    },
  ])('拒绝无效 trace declaration', ({ tracePhases, code }) => {
    const owner = defineOwner('counter');
    expect(() =>
      defineRuntimeProgram({
        id: { owner: 'counter', key: 'trace' },
        owners: [owner],
        programs: [],
        tracePhases: tracePhases as never,
        artifact: { capture: (value: number) => value, readForProgram: value => value, read: value => value },
        run: () => ({ kind: RuntimeProgramKind.Full, artifact: 1 }),
      }),
    ).toThrowError(expect.objectContaining({ code }));
  });

  it('拒绝 duplicate、unknown owner 与 unknown program', () => {
    const owner = defineOwner('counter');
    const unknownOwner = defineOwner('unknown');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const first = defineProgram(owner, { owner: 'counter', key: 'same' });
    const duplicate = defineProgram(owner, { owner: 'counter', key: 'same' });
    const missingOwner = defineProgram(unknownOwner, { owner: 'unknown', key: 'missing-owner' });
    const missingProgram = defineProgram(owner, { owner: 'counter', key: 'missing-program' }, [first]);

    expect(() => createRuntimeProgramRegistry({ owners, builtins: [first, duplicate] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ProgramDuplicate }),
    );
    expect(() => createRuntimeProgramRegistry({ owners, builtins: [missingOwner] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Unknown }),
    );
    expect(() => createRuntimeProgramRegistry({ owners, builtins: [missingProgram] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ProgramUnknown }),
    );
  });

  it('拒绝 Program id 指向未注册 owner 与伪造 owner registry', () => {
    const owner = defineOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const wrongProgramOwner = defineProgram(owner, { owner: 'missing', key: 'program' });

    expect(() => createRuntimeProgramRegistry({ owners, builtins: [wrongProgramOwner] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Unknown }),
    );
    expect(() =>
      createRuntimeProgramRegistry({
        owners: {
          definitions: () => [],
          find: () => undefined,
          resolve: definition => definition,
        },
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.RegistryMismatch }));
  });

  it.each(['self', 'cycle'] as const)('防御性 graph validation 拒绝 %s dependency', kind => {
    const owner = defineOwner('counter');
    const a = defineProgram(owner, { owner: 'counter', key: 'a' });
    const b = defineProgram(owner, { owner: 'counter', key: 'b' });
    const dependencies =
      kind === 'self'
        ? new Map<RuntimeProgramToken, ReadonlyArray<RuntimeProgramToken>>([
            [a, [a]],
            [b, []],
          ])
        : new Map<RuntimeProgramToken, ReadonlyArray<RuntimeProgramToken>>([
            [a, [b]],
            [b, [a]],
          ]);

    expect(() => sortRuntimeProgramGraph([a, b], definition => dependencies.get(definition) ?? [])).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ProgramCycle }),
    );
  });

  it('拒绝 object literal 与 foreign module Program token', async () => {
    const owner = defineOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const forged = { id: { owner: 'counter', key: 'forged' } } as RuntimeProgramDefinition<
      number,
      number,
      number,
      number
    >;
    expect(() => createRuntimeProgramRegistry({ owners, custom: [forged] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ProgramTokenInvalid }),
    );

    vi.resetModules();
    const { defineRuntimeProgram: defineForeignProgram } = await import('../../src/program/define');
    const foreign = defineForeignProgram({
      id: { owner: 'counter', key: 'foreign' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: (value: number) => value, readForProgram: value => value, read: value => value },
      run: () => ({ kind: RuntimeProgramKind.Full, artifact: 1 }),
    });
    expect(() => createRuntimeProgramRegistry({ owners, custom: [foreign] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ProgramTokenInvalid }),
    );
  });
});
