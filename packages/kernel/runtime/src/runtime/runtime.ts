import type {
  RuntimeCandidateLookup,
  RuntimeCandidateView,
  RuntimeCommitEvent,
  RuntimePreparedComputationArtifact,
  RuntimeComputationContext,
  RuntimeComputationDefinition,
  RuntimeComputationErasedExecutor,
  RuntimeComputationToken,
} from '../computation';
import { RuntimeComputationExecution, RuntimeComputationKind, RuntimeComputationPhase } from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import { RuntimeDiagnosticCode, RuntimeDiagnosticPhase } from '../diagnostic';
import type { RuntimeSourceLifecycleDiagnostic } from '../error';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type {
  RuntimeCommitParticipant,
  RuntimeCommitParticipantToken,
  RuntimeParticipantContext,
  RuntimePreparedCommit,
} from '../participant';
import type { RuntimeCommitParticipantExecutor } from '../participant/internal';
import {
  claimRuntimeCommitParticipants,
  consumeRuntimeCommitParticipant,
  getRuntimeCommitParticipantExecutor,
  isRuntimeCommitParticipant,
} from '../participant/internal';
import type { RuntimeSourceRegistry } from '../registry';
import { getRuntimeComputationSourceRegistry, getRuntimeComputationRegistryExecutor } from '../registry';
import type {
  RuntimeSourceDefinition,
  RuntimeSourceExecutor,
  RuntimeSourceToken,
  RuntimePreparedSourceValue,
  RuntimeRevision,
} from '../source';
import { createRuntimeSourceExecutor } from '../source';
import type { PerformanceTraceDiagnostic, RuntimeTraceReporter } from '../trace';
import { createRuntimeTraceReporter } from '../trace';
import { observeRuntimeTraceReporterDiagnostics } from '../trace/internal';
import type { RuntimeSourceCommandExecutor, RuntimeResult, RuntimeUpdate, RuntimeSnapshot } from '../transaction';
import {
  createNextRuntimeRevision,
  createRuntimeRevision,
  getRuntimeSourceCommandExecutor,
  isRuntimeRevision,
} from '../transaction';
import { RuntimeUpdateStrategy } from './constants';
import type { Runtime, RuntimeOptions } from './types';

type RuntimeSourceState = Readonly<{
  command: RuntimeSourceCommandExecutor;
  prepared: RuntimePreparedSourceValue<unknown, unknown>;
}>;

type RuntimeComputationState = Readonly<{
  definition: RuntimeComputationToken;
  executor: RuntimeComputationErasedExecutor;
  prepared: RuntimePreparedComputationArtifact<unknown, unknown, unknown>;
}>;

type RuntimeComputationOutcome = Exclude<RuntimeComputationKind, typeof RuntimeComputationKind.Bailout>;

type RuntimePreparedParticipantState = Readonly<{
  executor: RuntimeCommitParticipantExecutor;
  prepared: RuntimePreparedCommit;
  takeDiagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
}>;

type NormalizedRunResult = Readonly<{ kind: typeof RuntimeComputationKind.Full; artifact: unknown }>;

type NormalizedUpdateResult =
  | Readonly<{ kind: typeof RuntimeComputationKind.Bailout }>
  | Readonly<{ kind: typeof RuntimeComputationKind.Incremental; artifact: unknown }>
  | Readonly<{
      kind: typeof RuntimeComputationKind.Fallback;
      diagnostics?: ReadonlyArray<Readonly<{ code: string; phase: RuntimeDiagnosticPhase; message: string }>>;
    }>;

type RuntimeState =
  | 'preparing'
  | 'idle'
  | 'observing'
  | 'retiring'
  | 'broken'
  | 'disposing'
  | 'dispose-pending'
  | 'disposed';

const runtimeDiagnosticPhases = new Set<RuntimeDiagnosticPhase>(Object.values(RuntimeDiagnosticPhase));

const isRuntimeDiagnosticPhase = (value: unknown): value is RuntimeDiagnosticPhase =>
  typeof value === 'string' && runtimeDiagnosticPhases.has(value as RuntimeDiagnosticPhase);

/** 创建 runtime contract 错误 */
const runtimeError = (
  code:
    | typeof RetikzRuntimeErrorCode.RegistryMismatch
    | typeof RetikzRuntimeErrorCode.UpdateStrategyInvalid
    | typeof RetikzRuntimeErrorCode.InitialSourceMismatch
    | typeof RetikzRuntimeErrorCode.SourceCommandInvalid
    | typeof RetikzRuntimeErrorCode.RevisionInvalid
    | typeof RetikzRuntimeErrorCode.RevisionStale
    | typeof RetikzRuntimeErrorCode.ChangeSetRevisionMismatch
    | typeof RetikzRuntimeErrorCode.UndeclaredDependency
    | typeof RetikzRuntimeErrorCode.Reentrant
    | typeof RetikzRuntimeErrorCode.Disposed
    | typeof RetikzRuntimeErrorCode.ParticipantTokenInvalid
    | typeof RetikzRuntimeErrorCode.ParticipantDuplicate
    | typeof RetikzRuntimeErrorCode.ParticipantDependencyInvalid
    | typeof RetikzRuntimeErrorCode.ParticipantUnknown
    | typeof RetikzRuntimeErrorCode.ParticipantAlreadyOwned
    | typeof RetikzRuntimeErrorCode.ParticipantRollbackFailed,
  phase: string,
  cause?: unknown,
  owner?: string,
) => Object.freeze(new RetikzRuntimeError({ code, phase, cause, owner }));

/** 把 Computation callback throw 转成稳定 lifecycle error */
const computationError = (
  code: typeof RetikzRuntimeErrorCode.ComputationRunFailed | typeof RetikzRuntimeErrorCode.ComputationUpdateFailed,
  phase: 'run' | 'update',
  definition: RuntimeComputationToken,
  cause: unknown,
  diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
) =>
  new RetikzRuntimeError({
    code,
    phase,
    owner: definition.id.owner,
    computation: definition.id,
    cause,
    diagnostics,
  });

/** 把 participant callback throw 转成稳定 lifecycle error */
const participantError = (
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
const participantLifecycleDiagnostic = (
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
    message: cause instanceof Error ? cause.message : String(cause),
    owner: participant.key,
    cause,
  });

/** 校验 participant prepare 返回的 transaction token */
const normalizePreparedCommit = (value: unknown, participant: RuntimeCommitParticipantToken): RuntimePreparedCommit => {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof Reflect.get(value, 'commit') !== 'function' ||
    typeof Reflect.get(value, 'rollback') !== 'function' ||
    typeof Reflect.get(value, 'dispose') !== 'function'
  ) {
    throw participantError(RetikzRuntimeErrorCode.ParticipantPrepareFailed, 'prepare', participant, value);
  }
  return value as RuntimePreparedCommit;
};

/** 把 observer throw 转成不影响 publish 的结构化诊断 */
const observerDiagnostic = (definition: RuntimeComputationToken, cause: unknown): RuntimeDiagnostic =>
  Object.freeze({
    code: RuntimeDiagnosticCode.ComputationObserverFailed,
    phase: 'observe',
    severity: 'error',
    message: cause instanceof Error ? cause.message : String(cause),
    owner: definition.id.owner,
    computation: definition.id,
    cause,
  });

const traceDiagnosticCodes = {
  'invalid-record': RuntimeDiagnosticCode.TraceInvalidRecord,
  'sink-threw': RuntimeDiagnosticCode.TraceSinkFailed,
  'reentrant-report': RuntimeDiagnosticCode.TraceReentrant,
} as const;

/** 失败 transaction 可从 Runtime 内部保留的 execution diagnostic 闭集 */
const executionDiagnosticCodes = new Set<string>([
  ...Object.values(traceDiagnosticCodes),
  RuntimeDiagnosticCode.ArtifactDisposeFailed,
  RuntimeDiagnosticCode.SourceDisposeFailed,
]);

/** 把 reporter-local diagnostic 映射到固定 Computation context */
const mapTraceDiagnostic = (
  definition: RuntimeComputationToken,
  diagnostic: PerformanceTraceDiagnostic,
): RuntimeDiagnostic =>
  Object.freeze({
    code: traceDiagnosticCodes[diagnostic.code],
    phase: 'trace',
    severity: 'error',
    message: `Runtime trace reporter rejected a ${diagnostic.code} record during ${diagnostic.phase}`,
    owner: definition.id.owner,
    computation: definition.id,
  });

/** 把 reporter-local diagnostic 映射到固定 participant context */
const mapParticipantTraceDiagnostic = (
  participant: RuntimeCommitParticipantToken,
  diagnostic: PerformanceTraceDiagnostic,
): RuntimeDiagnostic =>
  Object.freeze({
    code: traceDiagnosticCodes[diagnostic.code],
    phase: 'trace',
    severity: 'error',
    message: `Runtime trace reporter rejected a ${diagnostic.code} record during ${diagnostic.phase}`,
    owner: participant.key,
  });

/** 创建只写 participant context，并由 Runtime 独占 reporter drain */
const createParticipantInvocation = (
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
        const candidate: unknown = warning;
        if (typeof candidate !== 'object' || candidate === null) {
          throw new RetikzRuntimeError({
            code: RetikzRuntimeErrorCode.InternalInvariant,
            message: 'invalid diagnostic input',
            phase: 'runtime-diagnostic',
            cause: candidate,
          });
        }
        const code = Reflect.get(candidate, 'code');
        const phase = Reflect.get(candidate, 'phase');
        const message = Reflect.get(candidate, 'message');
        if (typeof code !== 'string' || !isRuntimeDiagnosticPhase(phase) || typeof message !== 'string') {
          throw new RetikzRuntimeError({
            code: RetikzRuntimeErrorCode.InternalInvariant,
            message: 'invalid diagnostic input',
            phase: 'runtime-diagnostic',
            cause: candidate,
          });
        }
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

/** 把 Source cleanup diagnostic 归一为 runtime diagnostic */
const mapSourceLifecycleDiagnostic = (diagnostic: RuntimeSourceLifecycleDiagnostic): RuntimeDiagnostic =>
  Object.freeze({
    ...diagnostic,
    severity: 'error',
  });

/** 判断失败 transaction 中仍需保留的执行诊断 */
const isExecutionDiagnostic = (diagnostic: RuntimeDiagnostic): boolean =>
  diagnostic.severity === 'error' && executionDiagnosticCodes.has(diagnostic.code);

/** 保留 lifecycle primary error，并替换为完整 secondary diagnostics envelope */
const withFailureDiagnostics = (cause: unknown, diagnostics: ReadonlyArray<RuntimeDiagnostic>): unknown => {
  if (cause instanceof RetikzRuntimeError) {
    return new RetikzRuntimeError({
      code: cause.code,
      phase: cause.phase,
      cause: cause.cause,
      owner: cause.owner,
      computation: cause.computation,
      diagnostics,
    });
  }
  return cause;
};

/** 读取 primary error 已携带的 execution diagnostics */
const errorDiagnostics = (cause: unknown): ReadonlyArray<RuntimeDiagnostic> => {
  if (cause instanceof RetikzRuntimeError) return cause.diagnostics;
  return Object.freeze([]);
};

/** 单次读取并归一化 JavaScript full callback 返回值 */
const normalizeRunResult = (result: unknown, definition: RuntimeComputationToken): NormalizedRunResult => {
  if (typeof result !== 'object' || result === null) {
    throw computationError(RetikzRuntimeErrorCode.ComputationRunFailed, 'run', definition, result);
  }
  let kind: unknown;
  let hasArtifact: boolean;
  let artifact: unknown;
  try {
    kind = Reflect.get(result, 'kind');
    hasArtifact = Object.prototype.hasOwnProperty.call(result, 'artifact');
    artifact = hasArtifact ? Reflect.get(result, 'artifact') : undefined;
  } catch (cause) {
    throw computationError(RetikzRuntimeErrorCode.ComputationRunFailed, 'run', definition, cause);
  }
  if (kind !== RuntimeComputationKind.Full || !hasArtifact) {
    throw computationError(RetikzRuntimeErrorCode.ComputationRunFailed, 'run', definition, result);
  }
  return Object.freeze({ kind: RuntimeComputationKind.Full, artifact });
};

/** 单次读取并归一化 JavaScript incremental callback 返回值 */
const normalizeUpdateResult = (result: unknown, definition: RuntimeComputationToken): NormalizedUpdateResult => {
  if (typeof result !== 'object' || result === null) {
    throw computationError(RetikzRuntimeErrorCode.ComputationUpdateFailed, 'update', definition, result);
  }
  let kind: unknown;
  try {
    kind = Reflect.get(result, 'kind');
  } catch (cause) {
    throw computationError(RetikzRuntimeErrorCode.ComputationUpdateFailed, 'update', definition, cause);
  }
  if (kind === RuntimeComputationKind.Bailout) return Object.freeze({ kind });
  if (kind === RuntimeComputationKind.Incremental) {
    let hasArtifact: boolean;
    let artifact: unknown;
    try {
      hasArtifact = Object.prototype.hasOwnProperty.call(result, 'artifact');
      artifact = hasArtifact ? Reflect.get(result, 'artifact') : undefined;
    } catch (cause) {
      throw computationError(RetikzRuntimeErrorCode.ComputationUpdateFailed, 'update', definition, cause);
    }
    if (hasArtifact) return Object.freeze({ kind, artifact });
  }
  if (kind === RuntimeComputationKind.Fallback) {
    let fallbackDiagnostics: unknown;
    try {
      fallbackDiagnostics = Reflect.get(result, 'diagnostics');
    } catch (cause) {
      throw computationError(RetikzRuntimeErrorCode.ComputationUpdateFailed, 'update', definition, cause);
    }
    if (fallbackDiagnostics === undefined) return Object.freeze({ kind });
    if (Array.isArray(fallbackDiagnostics)) {
      const diagnostics: Array<Readonly<{ code: string; phase: RuntimeDiagnosticPhase; message: string }>> = [];
      let invalidDiagnostic = false;
      try {
        for (const diagnostic of fallbackDiagnostics) {
          if (typeof diagnostic !== 'object' || diagnostic === null) {
            invalidDiagnostic = true;
            break;
          }
          const code = Reflect.get(diagnostic, 'code');
          const diagnosticPhase = Reflect.get(diagnostic, 'phase');
          const message = Reflect.get(diagnostic, 'message');
          if (typeof code !== 'string' || !isRuntimeDiagnosticPhase(diagnosticPhase) || typeof message !== 'string') {
            invalidDiagnostic = true;
            break;
          }
          diagnostics.push(Object.freeze({ code, phase: diagnosticPhase, message }));
        }
      } catch (cause) {
        throw computationError(RetikzRuntimeErrorCode.ComputationUpdateFailed, 'update', definition, cause);
      }
      if (invalidDiagnostic)
        throw computationError(RetikzRuntimeErrorCode.ComputationUpdateFailed, 'update', definition, result);
      return Object.freeze({ kind, diagnostics: Object.freeze(diagnostics) });
    }
  }
  throw computationError(RetikzRuntimeErrorCode.ComputationUpdateFailed, 'update', definition, result);
};

/** 捕获 artifact 并拒绝会把 current disposable artifact 重新交给 Runtime 的 alias */
const prepareComputationArtifact = (
  definition: RuntimeComputationToken,
  executor: RuntimeComputationErasedExecutor,
  input: unknown,
  previous?: RuntimeComputationState,
  diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
): RuntimePreparedComputationArtifact<unknown, unknown, unknown> => {
  let prepared: RuntimePreparedComputationArtifact<unknown, unknown, unknown>;
  try {
    prepared = executor.prepareArtifact(input, previous?.prepared);
  } catch (cause) {
    if (cause instanceof RetikzRuntimeError) {
      throw withFailureDiagnostics(cause, Object.freeze([...diagnostics, ...cause.diagnostics]));
    }
    throw cause;
  }
  return prepared;
};

/** 校验 registry identity 并按 Source 顺序准备初始 values */
const prepareInitialSources = (
  sources: RuntimeSourceRegistry,
  initialSnapshots: RuntimeOptions['initialSnapshots'],
  executor: RuntimeSourceExecutor,
): Map<RuntimeSourceToken, RuntimeSourceState> => {
  if (!Array.isArray(initialSnapshots)) {
    throw runtimeError(RetikzRuntimeErrorCode.InitialSourceMismatch, 'initial', initialSnapshots);
  }
  const commands = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();
  for (const command of initialSnapshots) {
    const commandExecutor = getRuntimeSourceCommandExecutor(command);
    if (command.kind !== 'initial') {
      throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'initial', command);
    }
    if (sources.find(command.source.key) !== command.source || commands.has(command.source)) {
      throw runtimeError(RetikzRuntimeErrorCode.InitialSourceMismatch, 'initial', command, command.source.key);
    }
    commands.set(command.source, commandExecutor);
  }
  if (commands.size !== sources.definitions().length) {
    throw runtimeError(RetikzRuntimeErrorCode.InitialSourceMismatch, 'initial', initialSnapshots);
  }

  const states = new Map<RuntimeSourceToken, RuntimeSourceState>();
  try {
    for (const source of sources.definitions()) {
      const command = commands.get(source);
      if (command === undefined) {
        throw runtimeError(RetikzRuntimeErrorCode.InitialSourceMismatch, 'initial', source, source.key);
      }
      states.set(source, Object.freeze({ command, prepared: command.prepare(executor).value }));
    }
  } catch (cause) {
    const diagnostics = [...errorDiagnostics(cause)];
    for (const source of [...sources.definitions()].reverse()) {
      const sourceState = states.get(source);
      if (sourceState !== undefined) {
        diagnostics.push(
          ...sourceState.command.retire(executor, sourceState.prepared).diagnostics.map(mapSourceLifecycleDiagnostic),
        );
      }
    }
    throw withFailureDiagnostics(cause, Object.freeze(diagnostics));
  }
  return states;
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
    candidatePhase: 'candidate-read' | 'candidate-change' | 'candidate-artifact',
    cause: unknown,
    source: string,
  ) => {
    const error = runtimeError(RetikzRuntimeErrorCode.UndeclaredDependency, candidatePhase, cause, source);
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
    changed: source => {
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
    artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
      dependency: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
    ): RuntimeSnapshot<TPublicRead> => {
      if (!declaredComputations.has(dependency)) {
        throw candidateError('candidate-artifact', dependency, computation.id.owner);
      }
      const state = computationStates.get(dependency);
      if (state === undefined) {
        throw candidateError('candidate-artifact', dependency, computation.id.owner);
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

/** 运行一个 Computation callback 并捕获 artifact 双层 read */
const runComputation = (
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
        const candidate: unknown = diagnostic;
        if (typeof candidate !== 'object' || candidate === null) {
          throw new RetikzRuntimeError({
            code: RetikzRuntimeErrorCode.InternalInvariant,
            message: 'runtime Computation diagnostic input is invalid',
            phase: 'computation-diagnostic',
            cause: candidate,
          });
        }
        const code = Reflect.get(candidate, 'code');
        const diagnosticPhase = Reflect.get(candidate, 'phase');
        const message = Reflect.get(candidate, 'message');
        if (typeof code !== 'string' || !isRuntimeDiagnosticPhase(diagnosticPhase) || typeof message !== 'string') {
          throw new RetikzRuntimeError({
            code: RetikzRuntimeErrorCode.InternalInvariant,
            message: 'runtime Computation diagnostic input is invalid',
            phase: 'computation-diagnostic',
            cause: candidate,
          });
        }
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
    let callbackResult;
    try {
      callbackResult = executor.update<unknown, unknown>(previous.prepared.computationRead, view, context);
    } catch (cause) {
      drainTraceDiagnostics();
      if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) {
        throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
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
    let result: NormalizedUpdateResult;
    try {
      result = normalizeUpdateResult(callbackResult, definition);
    } catch (cause) {
      if (cause instanceof RetikzRuntimeError) {
        throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
      }
      throw cause;
    }
    if (result.kind === RuntimeComputationKind.Bailout) {
      return Object.freeze({ diagnostics: Object.freeze([...diagnostics]) });
    }
    if (result.kind === RuntimeComputationKind.Incremental) {
      return Object.freeze({
        state: Object.freeze({
          definition,
          executor,
          prepared: prepareComputationArtifact(definition, executor, result.artifact, previous, executionDiagnostics),
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
  let callbackResult;
  try {
    callbackResult = executor.run<unknown>(view, context);
  } catch (cause) {
    drainTraceDiagnostics();
    if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) {
      throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
    }
    throw computationError(RetikzRuntimeErrorCode.ComputationRunFailed, 'run', definition, cause, executionDiagnostics);
  }
  drainTraceDiagnostics();
  let result: NormalizedRunResult;
  try {
    result = normalizeRunResult(callbackResult, definition);
  } catch (cause) {
    if (cause instanceof RetikzRuntimeError) {
      throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
    }
    throw cause;
  }
  return Object.freeze({
    state: Object.freeze({
      definition,
      executor,
      prepared: prepareComputationArtifact(definition, executor, result.artifact, previous, executionDiagnostics),
    }),
    outcome:
      mode === RuntimeComputationExecution.Incremental || mode === RuntimeComputationExecution.Fallback
        ? RuntimeComputationKind.Fallback
        : RuntimeComputationKind.Full,
    diagnostics: Object.freeze([...diagnostics]),
  });
};

/** 创建同步 Snapshot transaction runtime */
export const createRuntime = (options: RuntimeOptions): Runtime => {
  let computationSources: RuntimeSourceRegistry;
  try {
    computationSources = getRuntimeComputationSourceRegistry(options.computations);
  } catch (cause) {
    throw runtimeError(RetikzRuntimeErrorCode.RegistryMismatch, 'runtime-create', cause);
  }
  if (computationSources !== options.sources) {
    throw runtimeError(RetikzRuntimeErrorCode.RegistryMismatch, 'runtime-create', options.computations);
  }
  const updateStrategyDescriptor = Object.getOwnPropertyDescriptor(options, 'updateStrategy');
  if (updateStrategyDescriptor !== undefined && !Object.hasOwn(updateStrategyDescriptor, 'value')) {
    throw runtimeError(RetikzRuntimeErrorCode.UpdateStrategyInvalid, 'runtime-create', updateStrategyDescriptor);
  }
  const updateStrategy = updateStrategyDescriptor?.value ?? RuntimeUpdateStrategy.Auto;
  if (updateStrategy !== RuntimeUpdateStrategy.Auto && updateStrategy !== RuntimeUpdateStrategy.Full) {
    throw runtimeError(RetikzRuntimeErrorCode.UpdateStrategyInvalid, 'runtime-create', updateStrategy);
  }
  const participantsInput = options.participants ?? [];
  const participantExecutors = new Map<RuntimeCommitParticipantToken, RuntimeCommitParticipantExecutor>();
  const participantKeys = new Set<string>();
  const participants: Array<RuntimeCommitParticipantToken> = [];
  for (const participantCandidate of participantsInput) {
    if (!isRuntimeCommitParticipant(participantCandidate)) {
      throw runtimeError(RetikzRuntimeErrorCode.ParticipantTokenInvalid, 'runtime-create', participantCandidate);
    }
    const participant = participantCandidate;
    if (participantKeys.has(participant.key)) {
      throw runtimeError(RetikzRuntimeErrorCode.ParticipantDuplicate, 'runtime-create', participant, participant.key);
    }
    participantKeys.add(participant.key);
    const sourceDependencies = new Set<RuntimeSourceToken>();
    for (const source of participant.sources) {
      if (sourceDependencies.has(source) || options.sources.find(source.key) !== source) {
        throw runtimeError(
          RetikzRuntimeErrorCode.ParticipantDependencyInvalid,
          'runtime-create',
          source,
          participant.key,
        );
      }
      sourceDependencies.add(source);
    }
    const computationDependencies = new Set<RuntimeComputationToken>();
    for (const computation of participant.computations) {
      if (computationDependencies.has(computation)) {
        throw runtimeError(
          RetikzRuntimeErrorCode.ParticipantDependencyInvalid,
          'runtime-create',
          computation,
          participant.key,
        );
      }
      try {
        if (options.computations.find(computation.id) !== computation) {
          throw new RetikzRuntimeError({
            code: RetikzRuntimeErrorCode.InternalInvariant,
            message: 'participant Computation dependency is not registered',
            phase: 'participant-dependency',
            cause: computation,
          });
        }
      } catch {
        throw runtimeError(
          RetikzRuntimeErrorCode.ParticipantDependencyInvalid,
          'runtime-create',
          computation,
          participant.key,
        );
      }
      computationDependencies.add(computation);
    }
    const executor = getRuntimeCommitParticipantExecutor(participant);
    if (executor === undefined) {
      throw runtimeError(
        RetikzRuntimeErrorCode.ParticipantTokenInvalid,
        'runtime-create',
        participant,
        participant.key,
      );
    }
    participants.push(participant);
    participantExecutors.set(participant, executor);
  }
  participants.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  Object.freeze(participants);
  const alreadyOwnedParticipant = claimRuntimeCommitParticipants(participants);
  if (alreadyOwnedParticipant !== undefined) {
    throw runtimeError(
      RetikzRuntimeErrorCode.ParticipantAlreadyOwned,
      'runtime-create',
      alreadyOwnedParticipant,
      alreadyOwnedParticipant.key,
    );
  }
  const sourceExecutor = createRuntimeSourceExecutor(options.sources);
  let sourceStates = new Map<RuntimeSourceToken, RuntimeSourceState>();
  let computationStates = new Map<RuntimeComputationToken, RuntimeComputationState>();
  let currentRevision = createRuntimeRevision(0);
  let state: RuntimeState = 'preparing';
  let brokenError: RetikzRuntimeError | undefined;
  let diagnosticQueue: Array<RuntimeDiagnostic> = [];
  const initialDiagnostics: Array<RuntimeDiagnostic> = [];
  const initialParticipantDiagnostics: Array<RuntimeDiagnostic> = [];
  const preparedParticipants = new Map<RuntimeCommitParticipantToken, RuntimePreparedParticipantState>();
  const participantDrains = new Map<RuntimeCommitParticipantToken, () => ReadonlyArray<RuntimeDiagnostic>>();
  let participantReads = new Map<RuntimeCommitParticipantToken, unknown>();
  const pendingParticipantDisposals = new Set(participants);
  let runtimeResourcesRetired = false;

  try {
    sourceStates = prepareInitialSources(options.sources, options.initialSnapshots, sourceExecutor);
    for (const definition of options.computations.definitions()) {
      const executor = getRuntimeComputationRegistryExecutor(options.computations, definition);
      const prepared = runComputation(
        RuntimeComputationPhase.Initial,
        undefined,
        currentRevision,
        sourceStates,
        new Set(options.sources.definitions()),
        new Map(),
        computationStates,
        definition,
        executor,
        options.trace,
        RuntimeComputationExecution.Full,
      );
      if (prepared.state === undefined) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.InternalInvariant,
          message: 'runtime: initial Computation returned no artifact',
          phase: 'computation-prepare',
          cause: prepared,
        });
      }
      computationStates.set(definition, prepared.state);
      initialDiagnostics.push(...prepared.diagnostics);
    }
    for (const participant of participants) {
      const executor = participantExecutors.get(participant);
      if (executor === undefined) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.InternalInvariant,
          message: 'runtime: missing participant executor',
          phase: 'participant-prepare',
          cause: participant,
        });
      }
      const invocationErrors = new WeakSet<RetikzRuntimeError>();
      const declaredSources = new Set(participant.sources);
      const declaredComputations = new Set(participant.computations);
      const view = Object.freeze({
        phase: RuntimeComputationPhase.Initial,
        candidateRevision: currentRevision,
        snapshot: <TInput, TValue, TRead, TChange>(
          source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
        ): RuntimeSnapshot<TRead> => {
          if (!declaredSources.has(source)) {
            const error = runtimeError(
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
            const error = runtimeError(
              RetikzRuntimeErrorCode.UndeclaredDependency,
              'participant-snapshot',
              source,
              participant.key,
            );
            invocationErrors.add(error);
            throw error;
          }
          return sourceState.command.snapshot(source, sourceState.prepared, currentRevision);
        },
        artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
          computation: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
        ): RuntimeSnapshot<TPublicRead> => {
          if (!declaredComputations.has(computation)) {
            const error = runtimeError(
              RetikzRuntimeErrorCode.UndeclaredDependency,
              'participant-artifact',
              computation,
              participant.key,
            );
            invocationErrors.add(error);
            throw error;
          }
          const computationState = computationStates.get(computation);
          if (computationState === undefined) {
            const error = runtimeError(
              RetikzRuntimeErrorCode.UndeclaredDependency,
              'participant-artifact',
              computation,
              participant.key,
            );
            invocationErrors.add(error);
            throw error;
          }
          return computationState.executor.snapshot(computation, computationState.prepared, currentRevision);
        },
      });
      const invocation = createParticipantInvocation(participant, options.trace);
      participantDrains.set(participant, invocation.takeDiagnostics);
      let preparedCandidate: unknown;
      try {
        preparedCandidate = executor.prepare(view, invocation.context);
      } catch (cause) {
        initialParticipantDiagnostics.push(...invocation.takeDiagnostics());
        if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) throw cause;
        throw participantError(RetikzRuntimeErrorCode.ParticipantPrepareFailed, 'prepare', participant, cause);
      }
      initialParticipantDiagnostics.push(...invocation.takeDiagnostics());
      const prepared = normalizePreparedCommit(preparedCandidate, participant);
      preparedParticipants.set(
        participant,
        Object.freeze({ executor, prepared, takeDiagnostics: invocation.takeDiagnostics }),
      );
    }
    for (const participant of participants) {
      try {
        preparedParticipants.get(participant)?.prepared.commit();
      } catch (cause) {
        initialParticipantDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
        throw participantError(RetikzRuntimeErrorCode.ParticipantCommitFailed, 'commit', participant, cause);
      }
      initialParticipantDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
    }
    const candidateReads = new Map<RuntimeCommitParticipantToken, unknown>();
    for (const participant of participants) {
      const executor = participantExecutors.get(participant);
      if (executor !== undefined) {
        try {
          candidateReads.set(participant, executor.read());
        } catch (cause) {
          initialParticipantDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
          throw participantError(RetikzRuntimeErrorCode.ParticipantReadFailed, 'read', participant, cause);
        }
        initialParticipantDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
      }
    }
    participantReads = candidateReads;
  } catch (cause) {
    const failedDiagnostics: Array<RuntimeDiagnostic> = [
      ...initialDiagnostics.filter(isExecutionDiagnostic),
      ...initialParticipantDiagnostics,
      ...(cause instanceof RetikzRuntimeError ? cause.diagnostics : []),
    ];
    for (const participant of [...participants].reverse()) {
      const participantState = preparedParticipants.get(participant);
      if (participantState !== undefined) {
        try {
          participantState.prepared.rollback();
          failedDiagnostics.push(...participantState.takeDiagnostics());
        } catch (rollbackCause) {
          failedDiagnostics.push(...participantState.takeDiagnostics());
          failedDiagnostics.push(
            participantLifecycleDiagnostic(
              RetikzRuntimeErrorCode.ParticipantRollbackFailed,
              'rollback',
              participant,
              rollbackCause,
            ),
          );
        }
      }
    }
    for (const participant of [...participants].reverse()) {
      const participantState = preparedParticipants.get(participant);
      if (participantState !== undefined) {
        try {
          participantState.prepared.dispose();
          failedDiagnostics.push(...participantState.takeDiagnostics());
        } catch (disposeCause) {
          failedDiagnostics.push(...participantState.takeDiagnostics());
          failedDiagnostics.push(
            participantLifecycleDiagnostic(
              RetikzRuntimeErrorCode.ParticipantTokenDisposeFailed,
              'token-dispose',
              participant,
              disposeCause,
            ),
          );
        }
      }
    }
    for (const participant of [...participants].reverse()) {
      let participantDisposeFailure: Readonly<{ cause: unknown }> | undefined;
      try {
        participantExecutors.get(participant)?.dispose();
      } catch (disposeCause) {
        participantDisposeFailure = Object.freeze({ cause: disposeCause });
      }
      failedDiagnostics.push(...(participantDrains.get(participant)?.() ?? []));
      if (participantDisposeFailure !== undefined) {
        failedDiagnostics.push(
          participantLifecycleDiagnostic(
            RetikzRuntimeErrorCode.ParticipantDisposeFailed,
            'participant-dispose',
            participant,
            participantDisposeFailure.cause,
          ),
        );
      }
      consumeRuntimeCommitParticipant(participant);
    }
    participantReads.clear();
    for (const definition of [...options.computations.definitions()].reverse()) {
      const prepared = computationStates.get(definition);
      if (prepared !== undefined) failedDiagnostics.push(...prepared.executor.retire(prepared.prepared));
    }
    for (const source of [...options.sources.definitions()].reverse()) {
      const prepared = sourceStates.get(source);
      if (prepared !== undefined) {
        failedDiagnostics.push(
          ...prepared.command.retire(sourceExecutor, prepared.prepared).diagnostics.map(mapSourceLifecycleDiagnostic),
        );
      }
    }
    throw withFailureDiagnostics(cause, Object.freeze(failedDiagnostics));
  }

  const assertIdle = (phase: string): void => {
    if (state === 'dispose-pending' || state === 'disposed') {
      throw runtimeError(RetikzRuntimeErrorCode.Disposed, phase, undefined);
    }
    if (state === 'broken') {
      throw runtimeError(RetikzRuntimeErrorCode.ParticipantRollbackFailed, phase, brokenError, brokenError?.owner);
    }
    if (state !== 'idle') throw runtimeError(RetikzRuntimeErrorCode.Reentrant, phase, state);
  };

  const runtime: Runtime = Object.freeze({
    revision: () => currentRevision,
    update: (update: RuntimeUpdate): RuntimeResult => {
      assertIdle('update');
      state = 'preparing';
      const updateState = { broken: false };
      try {
        const updateCandidate: unknown = update;
        if (typeof updateCandidate !== 'object' || updateCandidate === null) {
          throw runtimeError(RetikzRuntimeErrorCode.RevisionInvalid, 'update', updateCandidate);
        }
        if (!isRuntimeRevision(update.baseRevision)) {
          throw runtimeError(RetikzRuntimeErrorCode.RevisionInvalid, 'update', update.baseRevision);
        }
        if (update.baseRevision !== currentRevision) {
          throw runtimeError(RetikzRuntimeErrorCode.RevisionStale, 'update', update.baseRevision);
        }
        if (!Array.isArray(update.sources)) {
          throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'update', update.sources);
        }
        if (update.sources.length === 0) {
          return Object.freeze({
            revision: currentRevision,
            outcome: RuntimeComputationKind.Bailout,
            diagnostics: Object.freeze([]),
          });
        }

        const commands = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();
        for (const command of update.sources) {
          const executor = getRuntimeSourceCommandExecutor(command);
          if (command.kind !== 'update' || options.sources.find(command.source.key) !== command.source) {
            throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'update', command, command.source.key);
          }
          if (commands.has(command.source)) {
            throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'update', command, command.source.key);
          }
          commands.set(command.source, executor);
        }
        for (const [source, executor] of commands) {
          if (executor.changeSetBaseRevision !== undefined && executor.changeSetBaseRevision !== update.baseRevision) {
            throw runtimeError(
              RetikzRuntimeErrorCode.ChangeSetRevisionMismatch,
              'change-set',
              executor.changeSetBaseRevision,
              source.key,
            );
          }
        }
        const candidateRevision = createNextRuntimeRevision(currentRevision);

        const nextSourceStates = new Map(sourceStates);
        const changedSources = new Set<RuntimeSourceToken>();
        const invalidChangeSources = new Set<RuntimeSourceToken>();
        const changeSets = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();
        const candidateDiagnostics: Array<RuntimeDiagnostic> = [];
        const preparedSourceCandidates = new Map<RuntimeSourceToken, RuntimeSourceState>();
        try {
          for (const source of options.sources.definitions()) {
            const command = commands.get(source);
            if (command === undefined) continue;
            const previous = sourceStates.get(source);
            if (previous === undefined) {
              throw new RetikzRuntimeError({
                code: RetikzRuntimeErrorCode.InternalInvariant,
                message: `runtime: missing source state "${source.key}"`,
                phase: 'source-update',
                cause: source,
              });
            }
            const candidate = command.prepare(sourceExecutor, previous.prepared).value;
            const candidateState = Object.freeze({ command, prepared: candidate });
            preparedSourceCandidates.set(source, candidateState);
            if (command.compare(sourceExecutor, previous.prepared, candidate).value) {
              candidateDiagnostics.push(
                ...command.retire(sourceExecutor, candidate).diagnostics.map(mapSourceLifecycleDiagnostic),
              );
              preparedSourceCandidates.delete(source);
              continue;
            }
            if (command.validateChangeSet !== undefined) {
              let validation: 'valid' | 'fallback';
              try {
                validation = command.validateChangeSet(sourceExecutor, previous.prepared, candidate).value;
              } catch (cause) {
                preparedSourceCandidates.delete(source);
                throw cause;
              }
              if (validation === 'valid') changeSets.set(source, command);
              else {
                invalidChangeSources.add(source);
                candidateDiagnostics.push(
                  Object.freeze({
                    code: RuntimeDiagnosticCode.ChangeSetFallback,
                    phase: 'validate-change-set',
                    severity: 'warning',
                    message: `Runtime change hint for source "${source.key}" could not be validated`,
                    owner: source.key,
                  }),
                );
              }
            }
            nextSourceStates.set(source, candidateState);
            changedSources.add(source);
          }
        } catch (cause) {
          const failedDiagnostics = [...candidateDiagnostics.filter(isExecutionDiagnostic), ...errorDiagnostics(cause)];
          for (const source of [...options.sources.definitions()].reverse()) {
            const candidate = preparedSourceCandidates.get(source);
            if (candidate !== undefined) {
              failedDiagnostics.push(
                ...candidate.command
                  .retire(sourceExecutor, candidate.prepared)
                  .diagnostics.map(mapSourceLifecycleDiagnostic),
              );
            }
          }
          const frozenFailedDiagnostics = Object.freeze(failedDiagnostics);
          diagnosticQueue.push(...frozenFailedDiagnostics);
          throw withFailureDiagnostics(cause, frozenFailedDiagnostics);
        }
        if (changedSources.size === 0) {
          const bailoutDiagnostics = Object.freeze([...candidateDiagnostics]);
          diagnosticQueue.push(...bailoutDiagnostics);
          return Object.freeze({
            revision: currentRevision,
            outcome: RuntimeComputationKind.Bailout,
            diagnostics: bailoutDiagnostics,
          });
        }

        const nextComputationStates = new Map(computationStates);
        const computationOutcomes = new Map<RuntimeComputationToken, RuntimeComputationOutcome>();
        const candidateParticipantDiagnostics: Array<RuntimeDiagnostic> = [];
        const selectedParticipants: Array<RuntimeCommitParticipantToken> = [];
        const preparedUpdateParticipants = new Map<RuntimeCommitParticipantToken, RuntimePreparedParticipantState>();
        const nextParticipantReads = new Map(participantReads);
        try {
          for (const definition of options.computations.definitions()) {
            const executor = getRuntimeComputationRegistryExecutor(options.computations, definition);
            const directSourceChange = executor.sources.some(source => changedSources.has(source));
            const directInvalidHint = executor.sources.some(source => invalidChangeSources.has(source));
            const upstreamOutcomes = executor.computations
              .map(computation => computationOutcomes.get(computation))
              .filter((outcome): outcome is RuntimeComputationOutcome => outcome !== undefined);
            if (!directSourceChange && upstreamOutcomes.length === 0) continue;
            const upstreamFallback = upstreamOutcomes.some(outcome => outcome === RuntimeComputationKind.Fallback);
            const upstreamFull = upstreamOutcomes.some(outcome => outcome === RuntimeComputationKind.Full);
            const previous = computationStates.get(definition);
            if (previous === undefined) {
              throw new RetikzRuntimeError({
                code: RetikzRuntimeErrorCode.InternalInvariant,
                message: 'runtime: missing committed Computation state',
                phase: 'computation-update',
                cause: definition,
              });
            }
            const prepared = runComputation(
              RuntimeComputationPhase.Update,
              currentRevision,
              candidateRevision,
              nextSourceStates,
              changedSources,
              changeSets,
              nextComputationStates,
              definition,
              executor,
              options.trace,
              directInvalidHint || upstreamFallback
                ? RuntimeComputationExecution.Fallback
                : updateStrategy === RuntimeUpdateStrategy.Full || upstreamFull || executor.update === undefined
                  ? RuntimeComputationExecution.Full
                  : RuntimeComputationExecution.Incremental,
              previous,
            );
            candidateDiagnostics.push(...prepared.diagnostics);
            if (prepared.state === undefined || prepared.outcome === undefined) continue;
            nextComputationStates.set(definition, prepared.state);
            computationOutcomes.set(definition, prepared.outcome);
          }
          for (const participant of participants) {
            const isAffected =
              participant.sources.some(source => changedSources.has(source)) ||
              participant.computations.some(computation => computationOutcomes.has(computation));
            if (participant.revisionPolicy !== 'continuous' && !isAffected) continue;
            selectedParticipants.push(participant);
            const executor = participantExecutors.get(participant);
            if (executor === undefined) {
              throw new RetikzRuntimeError({
                code: RetikzRuntimeErrorCode.InternalInvariant,
                message: 'runtime: missing participant executor',
                phase: 'participant-commit',
                cause: participant,
              });
            }
            const invocationErrors = new WeakSet<RetikzRuntimeError>();
            const declaredSources = new Set(participant.sources);
            const declaredComputations = new Set(participant.computations);
            const view = Object.freeze({
              phase: RuntimeComputationPhase.Update,
              baseRevision: currentRevision,
              candidateRevision,
              snapshot: <TInput, TValue, TRead, TChange>(
                source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
              ): RuntimeSnapshot<TRead> => {
                if (!declaredSources.has(source)) {
                  const error = runtimeError(
                    RetikzRuntimeErrorCode.UndeclaredDependency,
                    'participant-snapshot',
                    source,
                    participant.key,
                  );
                  invocationErrors.add(error);
                  throw error;
                }
                const sourceState = nextSourceStates.get(source);
                if (sourceState === undefined) {
                  const error = runtimeError(
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
              artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
                computation: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
              ): RuntimeSnapshot<TPublicRead> => {
                if (!declaredComputations.has(computation)) {
                  const error = runtimeError(
                    RetikzRuntimeErrorCode.UndeclaredDependency,
                    'participant-artifact',
                    computation,
                    participant.key,
                  );
                  invocationErrors.add(error);
                  throw error;
                }
                const computationState = nextComputationStates.get(computation);
                if (computationState === undefined) {
                  const error = runtimeError(
                    RetikzRuntimeErrorCode.UndeclaredDependency,
                    'participant-artifact',
                    computation,
                    participant.key,
                  );
                  invocationErrors.add(error);
                  throw error;
                }
                return computationState.executor.snapshot(computation, computationState.prepared, candidateRevision);
              },
            });
            const invocation = createParticipantInvocation(participant, options.trace);
            participantDrains.set(participant, invocation.takeDiagnostics);
            let preparedCandidate: unknown;
            try {
              preparedCandidate = executor.prepare(view, invocation.context);
            } catch (cause) {
              candidateParticipantDiagnostics.push(...invocation.takeDiagnostics());
              if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) throw cause;
              throw participantError(RetikzRuntimeErrorCode.ParticipantPrepareFailed, 'prepare', participant, cause);
            }
            candidateParticipantDiagnostics.push(...invocation.takeDiagnostics());
            const prepared = normalizePreparedCommit(preparedCandidate, participant);
            preparedUpdateParticipants.set(
              participant,
              Object.freeze({ executor, prepared, takeDiagnostics: invocation.takeDiagnostics }),
            );
          }
          for (const participant of selectedParticipants) {
            try {
              preparedUpdateParticipants.get(participant)?.prepared.commit();
            } catch (cause) {
              candidateParticipantDiagnostics.push(
                ...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
              );
              throw participantError(RetikzRuntimeErrorCode.ParticipantCommitFailed, 'commit', participant, cause);
            }
            candidateParticipantDiagnostics.push(
              ...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
            );
          }
          for (const participant of selectedParticipants) {
            const executor = participantExecutors.get(participant);
            if (executor !== undefined) {
              try {
                nextParticipantReads.set(participant, executor.read());
              } catch (cause) {
                candidateParticipantDiagnostics.push(
                  ...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
                );
                throw participantError(RetikzRuntimeErrorCode.ParticipantReadFailed, 'read', participant, cause);
              }
              candidateParticipantDiagnostics.push(
                ...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
              );
            }
          }
        } catch (cause) {
          const failedDiagnostics: Array<RuntimeDiagnostic> = [
            ...candidateDiagnostics.filter(isExecutionDiagnostic),
            ...candidateParticipantDiagnostics,
            ...(cause instanceof RetikzRuntimeError ? cause.diagnostics : []),
          ];
          let firstRollbackFailure:
            | Readonly<{ participant: RuntimeCommitParticipantToken; cause: unknown }>
            | undefined;
          for (const participant of [...selectedParticipants].reverse()) {
            const prepared = preparedUpdateParticipants.get(participant)?.prepared;
            if (prepared === undefined) continue;
            try {
              prepared.rollback();
              failedDiagnostics.push(...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
            } catch (rollbackCause) {
              failedDiagnostics.push(...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
              if (firstRollbackFailure === undefined) {
                firstRollbackFailure = Object.freeze({ participant, cause: rollbackCause });
              } else {
                failedDiagnostics.push(
                  participantLifecycleDiagnostic(
                    RetikzRuntimeErrorCode.ParticipantRollbackFailed,
                    'rollback',
                    participant,
                    rollbackCause,
                  ),
                );
              }
            }
          }
          for (const participant of [...selectedParticipants].reverse()) {
            const prepared = preparedUpdateParticipants.get(participant)?.prepared;
            if (prepared === undefined) continue;
            try {
              prepared.dispose();
              failedDiagnostics.push(...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
            } catch (disposeCause) {
              failedDiagnostics.push(...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
              failedDiagnostics.push(
                participantLifecycleDiagnostic(
                  RetikzRuntimeErrorCode.ParticipantTokenDisposeFailed,
                  'token-dispose',
                  participant,
                  disposeCause,
                ),
              );
            }
          }
          for (const definition of [...options.computations.definitions()].reverse()) {
            const candidate = nextComputationStates.get(definition);
            const previous = computationStates.get(definition);
            if (candidate !== undefined && candidate !== previous) {
              failedDiagnostics.push(...candidate.executor.retire(candidate.prepared));
            }
          }
          for (const source of [...options.sources.definitions()].reverse()) {
            if (!changedSources.has(source)) continue;
            const candidate = nextSourceStates.get(source);
            const previous = sourceStates.get(source);
            if (candidate !== undefined && candidate !== previous) {
              failedDiagnostics.push(
                ...candidate.command
                  .retire(sourceExecutor, candidate.prepared)
                  .diagnostics.map(mapSourceLifecycleDiagnostic),
              );
            }
          }
          const frozenFailedDiagnostics = Object.freeze(failedDiagnostics);
          diagnosticQueue.push(...frozenFailedDiagnostics);
          if (firstRollbackFailure !== undefined) {
            brokenError = new RetikzRuntimeError({
              code: RetikzRuntimeErrorCode.ParticipantRollbackFailed,
              phase: 'rollback',
              owner: firstRollbackFailure.participant.key,
              cause: Object.freeze({ trigger: cause, rollback: firstRollbackFailure.cause }),
              diagnostics: frozenFailedDiagnostics,
            });
            state = 'broken';
            updateState.broken = true;
            throw brokenError;
          }
          throw withFailureDiagnostics(cause, frozenFailedDiagnostics);
        }

        const previousSourceStates = sourceStates;
        const previousComputationStates = computationStates;
        candidateDiagnostics.push(...candidateParticipantDiagnostics);
        sourceStates = nextSourceStates;
        computationStates = nextComputationStates;
        participantReads = nextParticipantReads;
        const baseRevision = currentRevision;
        currentRevision = candidateRevision;
        const frozenDiagnostics = Object.freeze([...candidateDiagnostics]);

        state = 'observing';
        for (const definition of options.computations.definitions()) {
          const outcome = computationOutcomes.get(definition);
          if (outcome === undefined) continue;
          const computationState = computationStates.get(definition);
          if (computationState === undefined || computationState.executor.observeCommit === undefined) continue;
          const event: RuntimeCommitEvent<unknown> = Object.freeze({
            phase: RuntimeComputationPhase.Update,
            baseRevision,
            revision: currentRevision,
            outcome,
            artifact: computationState.executor.snapshotToken(definition, computationState.prepared, currentRevision),
            diagnostics: frozenDiagnostics,
          });
          try {
            computationState.executor.observeCommit<unknown>(event);
          } catch (cause) {
            candidateDiagnostics.push(observerDiagnostic(definition, cause));
          }
        }

        state = 'retiring';
        for (const definition of [...options.computations.definitions()].reverse()) {
          if (!computationOutcomes.has(definition)) continue;
          const previous = previousComputationStates.get(definition);
          if (previous !== undefined) candidateDiagnostics.push(...previous.executor.retire(previous.prepared));
        }
        for (const source of [...options.sources.definitions()].reverse()) {
          if (!changedSources.has(source)) continue;
          const previous = previousSourceStates.get(source);
          if (previous !== undefined) {
            candidateDiagnostics.push(
              ...previous.command
                .retire(sourceExecutor, previous.prepared)
                .diagnostics.map(mapSourceLifecycleDiagnostic),
            );
          }
        }
        for (const participant of [...selectedParticipants].reverse()) {
          try {
            preparedUpdateParticipants.get(participant)?.prepared.dispose();
            candidateDiagnostics.push(...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
          } catch (cause) {
            candidateDiagnostics.push(...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
            candidateDiagnostics.push(
              participantLifecycleDiagnostic(
                RetikzRuntimeErrorCode.ParticipantTokenDisposeFailed,
                'token-dispose',
                participant,
                cause,
              ),
            );
          }
        }

        const resultDiagnostics = Object.freeze([...candidateDiagnostics]);
        diagnosticQueue.push(...resultDiagnostics);
        const outcome: RuntimeResult['outcome'] = [...computationOutcomes.values()].includes(
          RuntimeComputationKind.Fallback,
        )
          ? RuntimeComputationKind.Fallback
          : [...computationOutcomes.values()].includes(RuntimeComputationKind.Full)
            ? RuntimeComputationKind.Full
            : [...computationOutcomes.values()].includes(RuntimeComputationKind.Incremental)
              ? RuntimeComputationKind.Incremental
              : 'committed';
        return Object.freeze({ revision: currentRevision, outcome, diagnostics: resultDiagnostics });
      } finally {
        if (!updateState.broken) state = 'idle';
      }
    },
    snapshot: <TInput, TValue, TRead, TChange>(source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>) => {
      assertIdle('snapshot');
      options.sources.resolve(source);
      const sourceState = sourceStates.get(source);
      if (sourceState === undefined)
        throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'snapshot', source, source.key);
      return sourceState.command.snapshot(source, sourceState.prepared, currentRevision);
    },
    artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
      computation: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
    ): RuntimeSnapshot<TPublicRead> => {
      assertIdle('artifact');
      options.computations.resolve(computation);
      const computationState = computationStates.get(computation);
      if (computationState === undefined)
        throw runtimeError(RetikzRuntimeErrorCode.UndeclaredDependency, 'artifact', computation);
      return computationState.executor.snapshot(computation, computationState.prepared, currentRevision);
    },
    participant: <TRead>(participant: RuntimeCommitParticipant<TRead>): TRead => {
      const participantCandidate: unknown = participant;
      if (!isRuntimeCommitParticipant(participantCandidate)) {
        throw runtimeError(RetikzRuntimeErrorCode.ParticipantTokenInvalid, 'participant', participantCandidate);
      }
      if (!participantExecutors.has(participant)) {
        throw runtimeError(RetikzRuntimeErrorCode.ParticipantUnknown, 'participant', participant, participant.key);
      }
      assertIdle('participant');
      return participantReads.get(participant) as TRead;
    },
    diagnostics: () => {
      if (state !== 'idle' && state !== 'broken' && state !== 'dispose-pending' && state !== 'disposed') {
        throw runtimeError(RetikzRuntimeErrorCode.Reentrant, 'diagnostics', state);
      }
      const output = Object.freeze([...diagnosticQueue]);
      diagnosticQueue = [];
      return output;
    },
    dispose: () => {
      if (state === 'disposed') return;
      if (state !== 'broken' && state !== 'dispose-pending') assertIdle('dispose');
      state = 'disposing';
      /** 反向清理尚未成功的 participant，并只消费已完成的 token */
      const disposePendingParticipants = (): void => {
        for (const participant of [...participants].reverse()) {
          if (!pendingParticipantDisposals.has(participant)) continue;
          let participantDisposeFailure: Readonly<{ cause: unknown }> | undefined;
          try {
            participantExecutors.get(participant)?.dispose();
          } catch (cause) {
            participantDisposeFailure = Object.freeze({ cause });
          }
          diagnosticQueue.push(...(participantDrains.get(participant)?.() ?? []));
          if (participantDisposeFailure !== undefined) {
            diagnosticQueue.push(
              participantLifecycleDiagnostic(
                RetikzRuntimeErrorCode.ParticipantDisposeFailed,
                'participant-dispose',
                participant,
                participantDisposeFailure.cause,
              ),
            );
            continue;
          }
          pendingParticipantDisposals.delete(participant);
          consumeRuntimeCommitParticipant(participant);
        }
      };

      disposePendingParticipants();
      if (!runtimeResourcesRetired) {
        participantReads.clear();
        for (const definition of [...options.computations.definitions()].reverse()) {
          const computationState = computationStates.get(definition);
          if (computationState !== undefined)
            diagnosticQueue.push(...computationState.executor.retire(computationState.prepared));
        }
        for (const source of [...options.sources.definitions()].reverse()) {
          const sourceState = sourceStates.get(source);
          if (sourceState !== undefined) {
            diagnosticQueue.push(
              ...sourceState.command
                .retire(sourceExecutor, sourceState.prepared)
                .diagnostics.map(mapSourceLifecycleDiagnostic),
            );
          }
        }
        runtimeResourcesRetired = true;
        if (pendingParticipantDisposals.size > 0) disposePendingParticipants();
      }
      state = pendingParticipantDisposals.size > 0 ? 'dispose-pending' : 'disposed';
    },
  });

  initialDiagnostics.push(...initialParticipantDiagnostics);
  const frozenInitialDiagnostics = Object.freeze([...initialDiagnostics]);
  const completedInitialDiagnostics = [...initialDiagnostics];
  state = 'observing';
  for (const definition of options.computations.definitions()) {
    const computationState = computationStates.get(definition);
    if (computationState === undefined || computationState.executor.observeCommit === undefined) continue;
    const event: RuntimeCommitEvent<unknown> = Object.freeze({
      phase: RuntimeComputationPhase.Initial,
      revision: currentRevision,
      outcome: RuntimeComputationKind.Full,
      artifact: computationState.executor.snapshotToken(definition, computationState.prepared, currentRevision),
      diagnostics: frozenInitialDiagnostics,
    });
    try {
      computationState.executor.observeCommit<unknown>(event);
    } catch (cause) {
      completedInitialDiagnostics.push(observerDiagnostic(definition, cause));
    }
  }
  for (const participant of [...participants].reverse()) {
    try {
      preparedParticipants.get(participant)?.prepared.dispose();
      completedInitialDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
    } catch (cause) {
      completedInitialDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
      completedInitialDiagnostics.push(
        participantLifecycleDiagnostic(
          RetikzRuntimeErrorCode.ParticipantTokenDisposeFailed,
          'token-dispose',
          participant,
          cause,
        ),
      );
    }
  }
  diagnosticQueue.push(...completedInitialDiagnostics);
  state = 'idle';
  return runtime;
};
