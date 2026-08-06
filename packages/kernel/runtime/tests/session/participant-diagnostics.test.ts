import { describe, expect, it } from 'vitest';

import type { RuntimeDiagnostic, RuntimeParticipantContext } from '../../src';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  defineRuntimeOwner,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RuntimeError,
} from '../../src';
import { getRuntimeTraceReporterDiagnosticDrainCount } from '../../src/trace/internal';

const defineCounterOwner = (key = 'counter') =>
  defineRuntimeOwner<number, number, number, never>({
    key,
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
  });

describe('runtime session participant diagnostics', () => {
  it('trace facade 不暴露 drain，Runtime 在 diagnose/callback 后归属 reporter diagnostics', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    let capturedContext: RuntimeParticipantContext | undefined;
    const participant = defineRuntimeCommitParticipant({
      key: 'renderer',
      owners: [owner],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.SceneChange,
          outcomes: [PerformanceTraceOutcome.Incremental],
        },
      ],
      prepare: (_candidate, context) => {
        capturedContext = context;
        context.trace.report({
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.SceneChange,
          outcome: PerformanceTraceOutcome.Incremental,
          visited: 1,
          reused: 0,
          changed: 1,
        });
        context.diagnose({ code: 'RENDER_FALLBACK', phase: 'prepare', message: 'fallback' });
        return Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined });
      },
      read: () => Object.freeze({}),
      dispose: () => undefined,
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
      trace: () => {
        throw new Error('sink failed');
      },
    });

    expect(capturedContext?.trace).not.toHaveProperty('diagnostics');
    if (capturedContext === undefined) throw new Error('expected participant context');
    const report = capturedContext.trace.report;
    expect(getRuntimeTraceReporterDiagnosticDrainCount(report)).toBe(4);
    expect(session.diagnostics().map(diagnostic => diagnostic.code)).toEqual([
      'RUNTIME_TRACE_SINK_FAILED',
      'RENDER_FALLBACK',
    ]);
    session.dispose();
    expect(getRuntimeTraceReporterDiagnosticDrainCount(report)).toBe(5);
  });

  it('无效 diagnose 输入转 execution diagnostic，不向 callback 反抛', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const participant = defineRuntimeCommitParticipant({
      key: 'renderer',
      owners: [owner],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: (_candidate, context) => {
        const diagnose = context.diagnose as (input: unknown) => void;
        expect(() => diagnose({ code: 'BROKEN', phase: 'prepare' })).not.toThrow();
        context.diagnose({ code: 'VALID', phase: 'prepare', message: 'valid' });
        return Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined });
      },
      read: () => Object.freeze({}),
      dispose: () => undefined,
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
    });

    expect(session.diagnostics().map(diagnostic => diagnostic.code)).toEqual([
      'RUNTIME_PARTICIPANT_DIAGNOSTIC_INVALID',
      'VALID',
    ]);
    session.dispose();
  });

  it('initial prepare throw 时 warning 与 trace execution diagnostics 进入 primary envelope', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const trigger = new Error('prepare failed');
    const participant = defineRuntimeCommitParticipant({
      key: 'renderer',
      owners: [owner],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.SceneChange,
          outcomes: [PerformanceTraceOutcome.Incremental],
        },
      ],
      prepare: (_candidate, context) => {
        const report = context.trace.report as (record: unknown) => void;
        report({ phase: 'invalid' });
        context.diagnose({ code: 'ATTEMPTED', phase: 'prepare', message: 'attempted' });
        throw trigger;
      },
      read: () => Object.freeze({}),
      dispose: () => undefined,
    });

    let thrown: unknown;
    try {
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
        participants: [participant],
      });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_PREPARE_FAILED', cause: trigger }));
    expect((thrown as { diagnostics: ReadonlyArray<RuntimeDiagnostic> }).diagnostics.map(item => item.code)).toEqual([
      'RUNTIME_TRACE_INVALID_RECORD',
      'ATTEMPTED',
    ]);
  });

  it('CandidateView 自身的 undeclared dependency 原样传播，participant 伪造 RuntimeError 仍被包装', () => {
    const owner = defineCounterOwner();
    const foreign = defineCounterOwner('foreign');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner, foreign] });
    const programs = createRuntimeProgramRegistry({ owners });
    const undeclared = defineRuntimeCommitParticipant({
      key: 'undeclared',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        candidate.snapshot(foreign);
        return Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined });
      },
      read: () => Object.freeze({}),
      dispose: () => undefined,
    });
    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1), createRuntimeOwnerInput(foreign, 1)],
        participants: [undeclared],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_UNDECLARED_DEPENDENCY' }));

    const spoofed = new RuntimeError({ code: 'RUNTIME_UNDECLARED_DEPENDENCY', phase: 'spoofed' });
    const malicious = defineRuntimeCommitParticipant({
      key: 'malicious',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () => {
        throw spoofed;
      },
      read: () => Object.freeze({}),
      dispose: () => undefined,
    });
    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1), createRuntimeOwnerInput(foreign, 1)],
        participants: [malicious],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_PREPARE_FAILED', cause: spoofed }));
  });
});
