import type { RuntimeComputationDefinition, RuntimeComputationToken } from '../computation';
import { RuntimeComputationPhase } from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import { RuntimeDiagnosticCode } from '../diagnostic';
import { getRuntimeDiagnosticMessage, RuntimeTraceDiagnosticCodes } from '../diagnostic/internal';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type {
  RuntimeCommitParticipantToken,
  RuntimeParticipantContext,
  RuntimeParticipantCandidateView,
} from '../participant';
import type { RuntimeCommitParticipantExecutor } from '../participant/internal';
import type { RuntimeSourceDefinition, RuntimeSourceToken, RuntimeRevision } from '../source';
import type { PerformanceTraceDiagnostic } from '../trace';
import { createRuntimeTraceReporter } from '../trace';
import { observeRuntimeTraceReporterDiagnostics } from '../trace/internal';
import type { RuntimeSnapshot } from '../transaction';
import type { RuntimeComputationState, RuntimeSourceState, RuntimePreparedParticipantState } from './state';
import type { RuntimeOptions } from './types';

/** 创建当前 participant candidate 读取产生的依赖错误 */
const createParticipantDependencyError = (
  code: typeof RetikzRuntimeErrorCode.UndeclaredDependency,
  phase: string,
  cause: unknown,
  owner: string,
): RetikzRuntimeError => Object.freeze(new RetikzRuntimeError({ code, phase, cause, owner }));

/** 把 participant callback throw 转成稳定 lifecycle error */
export const createRuntimeParticipantError = (
  code:
    | typeof RetikzRuntimeErrorCode.ParticipantPrepareFailed
    | typeof RetikzRuntimeErrorCode.ParticipantCommitFailed
    | typeof RetikzRuntimeErrorCode.ParticipantReadFailed,
  phase: 'prepare' | 'commit' | 'read',
  participant: RuntimeCommitParticipantToken,
  cause: unknown,
  diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
) =>
  new RetikzRuntimeError({
    code,
    phase,
    owner: participant.key,
    cause,
    diagnostics,
  });

/** 把 participant cleanup throw 转成 secondary diagnostic */
export const createRuntimeParticipantLifecycleDiagnostic = (
  code:
    | typeof RetikzRuntimeErrorCode.ParticipantRollbackFailed
    | typeof RetikzRuntimeErrorCode.ParticipantTokenDisposeFailed
    | typeof RetikzRuntimeErrorCode.ParticipantDisposeFailed,
  phase: 'rollback' | 'token-dispose' | 'participant-dispose',
  participant: RuntimeCommitParticipantToken,
  cause: unknown,
): RuntimeDiagnostic =>
  Object.freeze({
    code,
    phase,
    severity: 'error',
    message: getRuntimeDiagnosticMessage(cause),
    owner: participant.key,
    cause,
  });

/** 把 reporter-local diagnostic 映射到固定 participant context */
const mapParticipantTraceDiagnostic = (
  participant: RuntimeCommitParticipantToken,
  diagnostic: PerformanceTraceDiagnostic,
): RuntimeDiagnostic =>
  Object.freeze({
    code: RuntimeTraceDiagnosticCodes[diagnostic.code],
    phase: 'trace',
    severity: 'error',
    message: `Runtime trace reporter rejected a ${diagnostic.code} record during ${diagnostic.phase}`,
    owner: participant.key,
  });

/** 创建只写 participant context，并由 Runtime 独占 reporter drain */
export const createRuntimeParticipantInvocation = (
  participant: RuntimeCommitParticipantToken,
  trace: RuntimeOptions['trace'],
): Readonly<{
  context: RuntimeParticipantContext;
  takeDiagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
}> => {
  let diagnostics: Array<RuntimeDiagnostic> = [];
  const traceReporter = createRuntimeTraceReporter({
    owner: participant.key,
    phases: participant.tracePhases,
    sink: trace ?? (() => undefined),
  });
  observeRuntimeTraceReporterDiagnostics(traceReporter, diagnostic => {
    diagnostics.push(mapParticipantTraceDiagnostic(participant, diagnostic));
  });

  const drainTraceDiagnostics = (): void => {
    traceReporter.diagnostics();
  };

  let diagnosing = false;
  const context: RuntimeParticipantContext = Object.freeze({
    trace: Object.freeze({ owner: traceReporter.owner, report: traceReporter.report }),
    diagnose: (warning): void => {
      if (diagnosing) {
        diagnostics.push(
          Object.freeze({
            code: RuntimeDiagnosticCode.ParticipantDiagnosticReentrant,
            phase: 'diagnose',
            severity: 'error',
            message: 'Runtime participant diagnose reentry was rejected',
            owner: participant.key,
          }),
        );
        return;
      }

      diagnosing = true;

      try {
        const { code, phase, message } = warning;
        diagnostics.push(Object.freeze({ code, phase, message, severity: 'warning' as const, owner: participant.key }));
      } catch (cause) {
        diagnostics.push(
          Object.freeze({
            code: RuntimeDiagnosticCode.ParticipantDiagnosticInvalid,
            phase: 'diagnose',
            severity: 'error',
            message: 'Runtime participant diagnostic input is invalid',
            owner: participant.key,
            cause,
          }),
        );
      } finally {
        diagnosing = false;
      }
    },
  });

  const takeDiagnostics = (): ReadonlyArray<RuntimeDiagnostic> => {
    drainTraceDiagnostics();
    const output = Object.freeze([...diagnostics]);
    diagnostics = [];

    return output;
  };

  return Object.freeze({ context, takeDiagnostics });
};

/** 为 initial / update 的固定候选状态准备一次 participant 提交 */
export const prepareRuntimeParticipant = (
  participant: RuntimeCommitParticipantToken,
  executor: RuntimeCommitParticipantExecutor,
  invocation: ReturnType<typeof createRuntimeParticipantInvocation>,
  phase: RuntimeComputationPhase,
  baseRevision: RuntimeRevision | undefined,
  candidateRevision: RuntimeRevision,
  sourceStates: ReadonlyMap<RuntimeSourceToken, RuntimeSourceState>,
  computationStates: ReadonlyMap<RuntimeComputationToken, RuntimeComputationState>,
  diagnostics: Array<RuntimeDiagnostic>,
): RuntimePreparedParticipantState => {
  const invocationErrors = new WeakSet<RetikzRuntimeError>();
  const declaredSources = new Set(participant.sources);
  const declaredComputations = new Set(participant.computations);
  const lookup = Object.freeze({
    snapshot: <TInput, TValue, TRead, TChange>(
      source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    ): RuntimeSnapshot<TRead> => {
      if (!declaredSources.has(source)) {
        const error = createParticipantDependencyError(
          RetikzRuntimeErrorCode.UndeclaredDependency,
          'participant-snapshot',
          source,
          participant.key,
        );
        invocationErrors.add(error);
        throw error;
      }

      const sourceState = sourceStates.get(source);
      if (sourceState === undefined) {
        const error = createParticipantDependencyError(
          RetikzRuntimeErrorCode.UndeclaredDependency,
          'participant-snapshot',
          source,
          participant.key,
        );
        invocationErrors.add(error);
        throw error;
      }

      return sourceState.command.snapshot(source, sourceState.prepared, candidateRevision);
    },
    result: <TResultInput, TResult, TComputationRead, TPublicRead>(
      computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
    ): RuntimeSnapshot<TPublicRead> => {
      if (!declaredComputations.has(computation)) {
        const error = createParticipantDependencyError(
          RetikzRuntimeErrorCode.UndeclaredDependency,
          'participant-result',
          computation,
          participant.key,
        );
        invocationErrors.add(error);
        throw error;
      }

      const computationState = computationStates.get(computation);
      if (computationState === undefined) {
        const error = createParticipantDependencyError(
          RetikzRuntimeErrorCode.UndeclaredDependency,
          'participant-result',
          computation,
          participant.key,
        );
        invocationErrors.add(error);
        throw error;
      }

      return computationState.executor.snapshot(computation, computationState.prepared, candidateRevision);
    },
  });

  const candidate: RuntimeParticipantCandidateView =
    phase === RuntimeComputationPhase.Initial
      ? Object.freeze({ ...lookup, phase, candidateRevision })
      : Object.freeze({ ...lookup, phase, candidateRevision, baseRevision: baseRevision ?? candidateRevision });
  try {
    const prepared = executor.prepare(candidate, invocation.context);
    return Object.freeze({ prepared, takeDiagnostics: invocation.takeDiagnostics });
  } catch (cause) {
    if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) throw cause;
    throw createRuntimeParticipantError(RetikzRuntimeErrorCode.ParticipantPrepareFailed, 'prepare', participant, cause);
  } finally {
    diagnostics.push(...invocation.takeDiagnostics());
  }
};
