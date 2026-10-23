import type {
  RuntimeCandidateLookup,
  RuntimeCandidateView,
  RuntimeComputationContext,
  RuntimeComputationDefinition,
  RuntimeComputationErasedExecutor,
  RuntimeComputationToken,
  RuntimePreparedComputationResult,
  RuntimeUpdateOutcome,
} from '../computation';
import { RuntimeComputationExecution, RuntimeComputationKind, RuntimeComputationPhase } from '../computation';
import type { RuntimeDiagnostic, RuntimeDiagnosticPhase } from '../diagnostic';
import { BuiltinRuntimeDiagnosticCode } from '../diagnostic';
import { getRuntimeDiagnosticMessage, RuntimeTraceDiagnosticCodes } from '../diagnostic/internal';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeRevision, RuntimeSourceDefinition, RuntimeSourceToken } from '../source';
import type { PerformanceTraceDiagnostic, RuntimeTraceReporter } from '../trace';
import { createRuntimeTraceReporter } from '../trace';
import type { RuntimeSnapshot, RuntimeSourceCommandExecutor } from '../transaction';
import { createRuntimeContractError, withRuntimeFailureDiagnostics } from './error';
import type { RuntimeComputationOutcome, RuntimeComputationState, RuntimeSourceState } from './state';
import type { RuntimeOptions } from './types';

/** 把 observer throw 转成不影响 publish 的结构化诊断 */
export const createRuntimeObserverDiagnostic = (
  definition: RuntimeComputationToken,
  cause: unknown,
): RuntimeDiagnostic =>
  Object.freeze({
    code: BuiltinRuntimeDiagnosticCode.ComputationObserverFailed,
    phase: 'observe',
    severity: 'error',
    message: getRuntimeDiagnosticMessage(cause),
    owner: definition.id.owner,
    computation: definition.id,
    cause,
  });

/** 把 reporter-local diagnostic 映射到固定 Computation context */
const mapTraceDiagnostic = (
  definition: RuntimeComputationToken,
  diagnostic: PerformanceTraceDiagnostic,
): RuntimeDiagnostic =>
  Object.freeze({
    code: RuntimeTraceDiagnosticCodes[diagnostic.code],
    phase: 'trace',
    severity: 'error',
    message: `Runtime trace reporter rejected a ${diagnostic.code} record during ${diagnostic.phase}`,
    owner: definition.id.owner,
    computation: definition.id,
  });

/** 捕获 result 并拒绝会把 current disposable result 重新交给 Runtime 的 alias */
const prepareComputationResult = (
  definition: RuntimeComputationToken,
  executor: RuntimeComputationErasedExecutor,
  input: unknown,
  previous?: RuntimeComputationState,
  diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
): RuntimePreparedComputationResult<unknown, unknown, unknown> => {
  let prepared: RuntimePreparedComputationResult<unknown, unknown, unknown>;

  try {
    prepared = executor.prepareResult(input, previous?.prepared);
  } catch (cause) {
    if (cause instanceof RetikzRuntimeError) {
      throw withRuntimeFailureDiagnostics(cause, Object.freeze([...diagnostics, ...cause.diagnostics]));
    }

    throw cause;
  }

  return prepared;
};

/** 为当前 Computation 构造只允许已声明依赖的 typed candidate view */
const createCandidateView = (
  phase: RuntimeComputationPhase,
  baseRevision: RuntimeRevision | undefined,
  candidateRevision: RuntimeRevision,
  sourceStates: ReadonlyMap<RuntimeSourceToken, RuntimeSourceState>,
  changedSources: ReadonlySet<RuntimeSourceToken>,
  changeSets: ReadonlyMap<RuntimeSourceToken, RuntimeSourceCommandExecutor>,
  computationStates: ReadonlyMap<RuntimeComputationToken, RuntimeComputationState>,
  computation: RuntimeComputationToken,
  executor: RuntimeComputationErasedExecutor,
  invocationErrors: WeakSet<RetikzRuntimeError>,
): RuntimeCandidateView => {
  const declaredSources = new Set(executor.sources);
  const declaredComputations = new Set(executor.computations);

  const candidateError = (
    candidatePhase: 'candidate-read' | 'candidate-change' | 'candidate-result',
    cause: unknown,
    source: string,
  ) => {
    const error = createRuntimeContractError(
      RetikzRuntimeErrorCode.UndeclaredDependency,
      candidatePhase,
      cause,
      source,
    );
    invocationErrors.add(error);
    return error;
  };

  const lookup: RuntimeCandidateLookup = Object.freeze({
    snapshot: <TInput, TValue, TRead, TChange>(source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>) => {
      if (!declaredSources.has(source)) {
        throw candidateError('candidate-read', source, source.key);
      }

      const state = sourceStates.get(source);
      if (state === undefined) {
        throw candidateError('candidate-read', source, source.key);
      }

      return state.command.snapshot(source, state.prepared, candidateRevision);
    },
    isChanged: source => {
      if (!declaredSources.has(source)) {
        throw candidateError('candidate-change', source, source.key);
      }

      return changedSources.has(source);
    },
    changeSet: <TInput, TValue, TRead, TChange>(source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>) => {
      if (!declaredSources.has(source)) {
        throw candidateError('candidate-change', source, source.key);
      }

      return changeSets.get(source)?.changeSet(source);
    },
    result: <TResultInput, TResult, TComputationRead, TPublicRead>(
      dependency: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
    ): RuntimeSnapshot<TPublicRead> => {
      if (!declaredComputations.has(dependency)) {
        throw candidateError('candidate-result', dependency, computation.id.owner);
      }

      const state = computationStates.get(dependency);
      if (state === undefined) {
        throw candidateError('candidate-result', dependency, computation.id.owner);
      }

      return state.executor.snapshot(dependency, state.prepared, candidateRevision);
    },
  });

  return phase === RuntimeComputationPhase.Initial
    ? Object.freeze({ ...lookup, phase, candidateRevision })
    : Object.freeze({
        ...lookup,
        phase,
        baseRevision: baseRevision ?? candidateRevision,
        candidateRevision,
      });
};

/** 运行一个 Computation callback 并捕获 result 双层 read */
export const runRuntimeComputation = (
  phase: RuntimeComputationPhase,
  baseRevision: RuntimeRevision | undefined,
  candidateRevision: RuntimeRevision,
  sourceStates: ReadonlyMap<RuntimeSourceToken, RuntimeSourceState>,
  changedSources: ReadonlySet<RuntimeSourceToken>,
  changeSets: ReadonlyMap<RuntimeSourceToken, RuntimeSourceCommandExecutor>,
  computationStates: ReadonlyMap<RuntimeComputationToken, RuntimeComputationState>,
  definition: RuntimeComputationToken,
  executor: RuntimeComputationErasedExecutor,
  trace: RuntimeOptions['trace'],
  mode: RuntimeComputationExecution,
  previous?: RuntimeComputationState,
): Readonly<{
  state?: RuntimeComputationState;
  outcome?: RuntimeComputationOutcome;
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}> => {
  /** 把 Computation callback throw 转成稳定 lifecycle error */
  const computationError = (
    code: typeof RetikzRuntimeErrorCode.ComputationRunFailed | typeof RetikzRuntimeErrorCode.ComputationUpdateFailed,
    failurePhase: 'run' | 'update',
    failedComputation: RuntimeComputationToken,
    cause: unknown,
    diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
  ) =>
    new RetikzRuntimeError({
      code,
      phase: failurePhase,
      owner: failedComputation.id.owner,
      computation: failedComputation.id,
      cause,
      diagnostics,
    });

  /** 只信任当前 callback invocation 内由 CandidateView 产生的 contract error */
  const invocationErrors = new WeakSet<RetikzRuntimeError>();
  const view = createCandidateView(
    phase,
    baseRevision,
    candidateRevision,
    sourceStates,
    changedSources,
    changeSets,
    computationStates,
    definition,
    executor,
    invocationErrors,
  );
  const diagnostics: Array<RuntimeDiagnostic> = [];
  const executionDiagnostics: Array<RuntimeDiagnostic> = [];
  const traceReporter: RuntimeTraceReporter = createRuntimeTraceReporter({
    owner: definition.id.owner,
    phases: executor.tracePhases,
    sink: trace ?? (() => undefined),
  });

  const drainTraceDiagnostics = (): void => {
    for (const diagnostic of traceReporter.diagnostics()) {
      const mapped = mapTraceDiagnostic(definition, diagnostic);
      diagnostics.push(mapped);
      executionDiagnostics.push(mapped);
    }
  };

  const createContext = (execution: RuntimeComputationContext['execution']): RuntimeComputationContext =>
    Object.freeze({
      execution,
      trace: Object.freeze({ owner: traceReporter.owner, report: traceReporter.report }),
      diagnose: (diagnostic: Readonly<{ code: string; phase: RuntimeDiagnosticPhase; message: string }>) => {
        drainTraceDiagnostics();
        const { code, phase: diagnosticPhase, message } = diagnostic;

        diagnostics.push(
          Object.freeze({
            code,
            phase: diagnosticPhase,
            message,
            severity: 'warning' as const,
            owner: definition.id.owner,
            computation: definition.id,
          }),
        );
      },
    });

  if (mode === RuntimeComputationExecution.Incremental && executor.update !== undefined && previous !== undefined) {
    const context = createContext(RuntimeComputationExecution.Incremental);
    let result: RuntimeUpdateOutcome<unknown>;

    try {
      const callbackResult = executor.update<unknown, unknown>(previous.prepared.computationRead, view, context);
      const kind = callbackResult.kind;
      switch (kind) {
        case RuntimeComputationKind.Bailout:
          result = Object.freeze({ kind });
          break;
        case RuntimeComputationKind.Incremental:
          result = Object.freeze({ kind, result: callbackResult.result });
          break;
        case RuntimeComputationKind.Fallback: {
          const warnings = callbackResult.diagnostics;
          result = Object.freeze({
            kind,
            diagnostics: warnings?.map(({ code, phase: diagnosticPhase, message }) =>
              Object.freeze({ code, phase: diagnosticPhase, message }),
            ),
          });
          break;
        }
      }
    } catch (cause) {
      drainTraceDiagnostics();
      if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) {
        throw withRuntimeFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
      }

      throw computationError(
        RetikzRuntimeErrorCode.ComputationUpdateFailed,
        'update',
        definition,
        cause,
        executionDiagnostics,
      );
    }

    drainTraceDiagnostics();
    if (result.kind === RuntimeComputationKind.Bailout) {
      return Object.freeze({ diagnostics: Object.freeze([...diagnostics]) });
    }

    if (result.kind === RuntimeComputationKind.Incremental) {
      return Object.freeze({
        state: Object.freeze({
          definition,
          executor,
          prepared: prepareComputationResult(definition, executor, result.result, previous, executionDiagnostics),
        }),
        outcome: RuntimeComputationKind.Incremental,
        diagnostics: Object.freeze([...diagnostics]),
      });
    }

    for (const diagnostic of result.diagnostics ?? []) context.diagnose(diagnostic);
  }

  const context = createContext(
    mode === RuntimeComputationExecution.Incremental ? RuntimeComputationExecution.Fallback : mode,
  );
  let resultInput: unknown;

  try {
    resultInput = executor.run<unknown>(view, context).result;
  } catch (cause) {
    drainTraceDiagnostics();
    if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) {
      throw withRuntimeFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
    }

    throw computationError(RetikzRuntimeErrorCode.ComputationRunFailed, 'run', definition, cause, executionDiagnostics);
  }

  drainTraceDiagnostics();
  return Object.freeze({
    state: Object.freeze({
      definition,
      executor,
      prepared: prepareComputationResult(definition, executor, resultInput, previous, executionDiagnostics),
    }),
    outcome:
      mode === RuntimeComputationExecution.Incremental || mode === RuntimeComputationExecution.Fallback
        ? RuntimeComputationKind.Fallback
        : RuntimeComputationKind.Full,
    diagnostics: Object.freeze([...diagnostics]),
  });
};
