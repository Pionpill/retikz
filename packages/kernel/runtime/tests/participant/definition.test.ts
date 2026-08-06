import { describe, expect, it } from 'vitest';

import * as runtime from '../../src';

describe('runtime commit participant definition', () => {
  it('从 Runtime 公共入口提供 nominal participant definition helper', () => {
    expect(Reflect.get(runtime, 'defineRuntimeCommitParticipant')).toBeTypeOf('function');
    expect(runtime).not.toHaveProperty('getRuntimeCommitParticipantExecutor');
    expect(runtime).not.toHaveProperty('claimRuntimeCommitParticipants');
    expect(runtime).not.toHaveProperty('consumeRuntimeCommitParticipant');
    expect(runtime).not.toHaveProperty('observeRuntimeTraceReporterDiagnostics');
    expect(runtime).not.toHaveProperty('getRuntimeTraceReporterDiagnosticDrainCount');
  });

  it('只在 token 上公开冻结 metadata，不暴露 lifecycle callbacks', () => {
    const input = {
      key: 'renderer',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: () => ({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
      read: () => Object.freeze({ value: 1 }),
      dispose: () => undefined,
    };
    const define = Reflect.get(runtime, 'defineRuntimeCommitParticipant') as (value: unknown) => unknown;

    const participant = define(input);

    expect(participant).toEqual({
      key: 'renderer',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
    });
    expect(Object.isFrozen(participant)).toBe(true);
    expect(participant).not.toHaveProperty('prepare');
    expect(participant).not.toHaveProperty('read');
    expect(participant).not.toHaveProperty('dispose');
  });

  it('校验输入并深复制冻结 trace declarations', () => {
    const outcomes: Array<runtime.PerformanceTraceOutcomeValue> = [runtime.PerformanceTraceOutcome.Incremental];
    const tracePhases = [
      {
        phase: runtime.PerformanceTracePhase.Update,
        unit: runtime.PerformanceTraceUnit.SceneChange,
        outcomes,
      },
    ];
    const participant = runtime.defineRuntimeCommitParticipant({
      key: 'renderer',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases,
      prepare: () => ({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
      read: () => Object.freeze({}),
      dispose: () => undefined,
    });
    outcomes.push('incremental');
    tracePhases[0] = { ...tracePhases[0], outcomes };

    expect(participant.tracePhases).toEqual([
      {
        phase: runtime.PerformanceTracePhase.Update,
        unit: runtime.PerformanceTraceUnit.SceneChange,
        outcomes: [runtime.PerformanceTraceOutcome.Incremental],
      },
    ]);
    expect(Object.isFrozen(participant.tracePhases[0])).toBe(true);
    expect(Object.isFrozen(participant.tracePhases[0]?.outcomes)).toBe(true);

    const define = runtime.defineRuntimeCommitParticipant as (input: unknown) => unknown;
    expect(() => define(null)).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_TOKEN_INVALID' }));
    expect(() =>
      define({
        key: '',
        owners: [],
        programs: [],
        revisionPolicy: 'continuous',
        tracePhases: [],
        prepare: () => ({}),
        read: () => ({}),
        dispose: () => undefined,
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_TOKEN_INVALID' }));
  });
});
