import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeOwnerLifecycleDiagnostic } from '../error';
import type {
  RuntimeOwnerDefinition,
  RuntimeOwnerExecutor,
  RuntimeOwnerToken,
  RuntimePreparedOwnerValue,
  RuntimeRevision,
} from '../owner';
import type {
  RuntimeCommitParticipant,
  RuntimeCommitParticipantToken,
  RuntimeParticipantContext,
  RuntimePreparedCommit,
} from '../participant';
import type { RuntimeCommitParticipantExecutor } from '../participant/internal';
import type {
  RuntimeCandidateLookup,
  RuntimeCandidateView,
  RuntimeCommitEvent,
  RuntimePreparedProgramArtifact,
  RuntimeProgramDefinition,
  RuntimeProgramErasedExecutor,
  RuntimeProgramToken,
} from '../program';
import type { RuntimeOwnerRegistry } from '../registry';
import type { PerformanceTraceDiagnostic, RuntimeTraceReporter } from '../trace';
import type {
  RuntimeOwnerCommandExecutor,
  RuntimeSessionResult,
  RuntimeSessionUpdate,
  RuntimeSnapshot,
} from '../transaction';
import type { RuntimeSession, RuntimeSessionOptions } from './types';

import { RuntimeError, RuntimeOwnerError } from '../error';
import { createRuntimeOwnerExecutor } from '../owner';
import {
  claimRuntimeCommitParticipants,
  consumeRuntimeCommitParticipant,
  getRuntimeCommitParticipantExecutor,
  isRuntimeCommitParticipant,
} from '../participant/internal';
import { getRuntimeProgramOwnerRegistry, getRuntimeProgramRegistryExecutor } from '../registry';
import { createRuntimeTraceReporter } from '../trace';
import { observeRuntimeTraceReporterDiagnostics } from '../trace/internal';
import {
  createNextRuntimeRevision,
  createRuntimeRevision,
  getRuntimeOwnerCommandExecutor,
  isRuntimeRevision,
} from '../transaction';

type RuntimeOwnerState = Readonly<{
  command: RuntimeOwnerCommandExecutor;
  prepared: RuntimePreparedOwnerValue<unknown, unknown>;
}>;

type RuntimeProgramState = Readonly<{
  definition: RuntimeProgramToken;
  executor: RuntimeProgramErasedExecutor;
  prepared: RuntimePreparedProgramArtifact<unknown, unknown, unknown>;
}>;

type RuntimeProgramOutcome = 'full' | 'incremental' | 'fallback';

type RuntimePreparedParticipantState = Readonly<{
  executor: RuntimeCommitParticipantExecutor;
  prepared: RuntimePreparedCommit;
  takeDiagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
}>;

type NormalizedRunResult = Readonly<{ kind: 'full'; artifact: unknown }>;

type NormalizedUpdateResult =
  | Readonly<{ kind: 'bailout' }>
  | Readonly<{ kind: 'incremental'; artifact: unknown }>
  | Readonly<{
      kind: 'fallback';
      diagnostics?: ReadonlyArray<Readonly<{ code: string; phase: string; message: string }>>;
    }>;

type RuntimeSessionState =
  | 'preparing'
  | 'idle'
  | 'observing'
  | 'retiring'
  | 'broken'
  | 'disposing'
  | 'dispose-pending'
  | 'disposed';

/** 创建 session contract 错误 */
const sessionError = (
  code:
    | 'RUNTIME_REGISTRY_MISMATCH'
    | 'RUNTIME_INITIAL_OWNER_MISMATCH'
    | 'RUNTIME_OWNER_COMMAND_INVALID'
    | 'RUNTIME_REVISION_INVALID'
    | 'RUNTIME_REVISION_STALE'
    | 'RUNTIME_CHANGESET_REVISION_MISMATCH'
    | 'RUNTIME_UNDECLARED_DEPENDENCY'
    | 'RUNTIME_SESSION_REENTRANT'
    | 'RUNTIME_SESSION_DISPOSED'
    | 'RUNTIME_PARTICIPANT_TOKEN_INVALID'
    | 'RUNTIME_PARTICIPANT_DUPLICATE'
    | 'RUNTIME_PARTICIPANT_DEPENDENCY_INVALID'
    | 'RUNTIME_PARTICIPANT_UNKNOWN'
    | 'RUNTIME_PARTICIPANT_ALREADY_OWNED'
    | 'RUNTIME_PARTICIPANT_ROLLBACK_FAILED',
  phase: string,
  cause?: unknown,
  owner?: string,
) => Object.freeze(new RuntimeError({ code, phase, cause, owner }));

/** 把 Program callback throw 转成稳定 lifecycle error */
const programError = (
  code: 'RUNTIME_PROGRAM_RUN_FAILED' | 'RUNTIME_PROGRAM_UPDATE_FAILED',
  phase: 'run' | 'update',
  definition: RuntimeProgramToken,
  cause: unknown,
  diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
) =>
  new RuntimeError({
    code,
    phase,
    owner: definition.id.owner,
    program: definition.id,
    cause,
    diagnostics,
  });

/** 把 participant callback throw 转成稳定 lifecycle error */
const participantError = (
  code: 'RUNTIME_PARTICIPANT_PREPARE_FAILED' | 'RUNTIME_PARTICIPANT_COMMIT_FAILED' | 'RUNTIME_PARTICIPANT_READ_FAILED',
  phase: 'prepare' | 'commit' | 'read',
  participant: RuntimeCommitParticipantToken,
  cause: unknown,
  diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
) =>
  new RuntimeError({
    code,
    phase,
    owner: participant.key,
    cause,
    diagnostics,
  });

/** 把 participant cleanup throw 转成 secondary diagnostic */
const participantLifecycleDiagnostic = (
  code:
    | 'RUNTIME_PARTICIPANT_ROLLBACK_FAILED'
    | 'RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED'
    | 'RUNTIME_PARTICIPANT_DISPOSE_FAILED',
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
    throw participantError('RUNTIME_PARTICIPANT_PREPARE_FAILED', 'prepare', participant, value);
  }
  return value as RuntimePreparedCommit;
};

/** 把 observer throw 转成不影响 publish 的结构化诊断 */
const observerDiagnostic = (definition: RuntimeProgramToken, cause: unknown): RuntimeDiagnostic =>
  Object.freeze({
    code: 'RUNTIME_PROGRAM_OBSERVER_FAILED',
    phase: 'observe',
    severity: 'error',
    message: cause instanceof Error ? cause.message : String(cause),
    owner: definition.id.owner,
    program: definition.id,
    cause,
  });

const traceDiagnosticCodes = {
  'invalid-record': 'RUNTIME_TRACE_INVALID_RECORD',
  'sink-threw': 'RUNTIME_TRACE_SINK_FAILED',
  'reentrant-report': 'RUNTIME_TRACE_REENTRANT',
} as const;

/** 失败 transaction 可从 Runtime 内部保留的 execution diagnostic 闭集 */
const executionDiagnosticCodes = new Set<string>([
  ...Object.values(traceDiagnosticCodes),
  'RUNTIME_ARTIFACT_DISPOSE_FAILED',
  'RUNTIME_OWNER_DISPOSE_FAILED',
]);

/** 把 reporter-local diagnostic 映射到固定 Program context */
const mapTraceDiagnostic = (
  definition: RuntimeProgramToken,
  diagnostic: PerformanceTraceDiagnostic,
): RuntimeDiagnostic =>
  Object.freeze({
    code: traceDiagnosticCodes[diagnostic.code],
    phase: 'trace',
    severity: 'error',
    message: `Runtime trace reporter rejected a ${diagnostic.code} record during ${diagnostic.phase}`,
    owner: definition.id.owner,
    program: definition.id,
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
  trace: RuntimeSessionOptions['trace'],
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
            code: 'RUNTIME_PARTICIPANT_DIAGNOSTIC_REENTRANT',
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
        if (typeof candidate !== 'object' || candidate === null) throw new Error('invalid diagnostic input');
        const code = Reflect.get(candidate, 'code');
        const phase = Reflect.get(candidate, 'phase');
        const message = Reflect.get(candidate, 'message');
        if (typeof code !== 'string' || typeof phase !== 'string' || typeof message !== 'string') {
          throw new Error('invalid diagnostic input');
        }
        diagnostics.push(Object.freeze({ code, phase, message, severity: 'warning' as const, owner: participant.key }));
      } catch (cause) {
        diagnostics.push(
          Object.freeze({
            code: 'RUNTIME_PARTICIPANT_DIAGNOSTIC_INVALID',
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

/** 把 owner cleanup diagnostic 归一为 session diagnostic */
const mapOwnerLifecycleDiagnostic = (diagnostic: RuntimeOwnerLifecycleDiagnostic): RuntimeDiagnostic =>
  Object.freeze({
    ...diagnostic,
    severity: 'error',
  });

/** 判断失败 transaction 中仍需保留的执行诊断 */
const isExecutionDiagnostic = (diagnostic: RuntimeDiagnostic): boolean =>
  diagnostic.severity === 'error' && executionDiagnosticCodes.has(diagnostic.code);

/** 保留 lifecycle primary error，并替换为完整 secondary diagnostics envelope */
const withFailureDiagnostics = (cause: unknown, diagnostics: ReadonlyArray<RuntimeDiagnostic>): unknown => {
  if (cause instanceof RuntimeError) {
    return new RuntimeError({
      code: cause.code,
      phase: cause.phase,
      cause: cause.cause,
      owner: cause.owner,
      program: cause.program,
      diagnostics,
    });
  }
  if (cause instanceof RuntimeOwnerError) {
    return new RuntimeError({
      code: cause.code,
      phase: cause.phase,
      cause: cause.cause,
      owner: cause.owner,
      diagnostics,
    });
  }
  return cause;
};

/** 读取 primary error 已携带的 execution diagnostics */
const errorDiagnostics = (cause: unknown): ReadonlyArray<RuntimeDiagnostic> => {
  if (cause instanceof RuntimeError) return cause.diagnostics;
  if (cause instanceof RuntimeOwnerError) return cause.diagnostics.map(mapOwnerLifecycleDiagnostic);
  return Object.freeze([]);
};

/** 单次读取并归一化 JavaScript full callback 返回值 */
const normalizeRunResult = (result: unknown, definition: RuntimeProgramToken): NormalizedRunResult => {
  if (typeof result !== 'object' || result === null) {
    throw programError('RUNTIME_PROGRAM_RUN_FAILED', 'run', definition, result);
  }
  let kind: unknown;
  let hasArtifact: boolean;
  let artifact: unknown;
  try {
    kind = Reflect.get(result, 'kind');
    hasArtifact = Object.prototype.hasOwnProperty.call(result, 'artifact');
    artifact = hasArtifact ? Reflect.get(result, 'artifact') : undefined;
  } catch (cause) {
    throw programError('RUNTIME_PROGRAM_RUN_FAILED', 'run', definition, cause);
  }
  if (kind !== 'full' || !hasArtifact) {
    throw programError('RUNTIME_PROGRAM_RUN_FAILED', 'run', definition, result);
  }
  return Object.freeze({ kind: 'full', artifact });
};

/** 单次读取并归一化 JavaScript incremental callback 返回值 */
const normalizeUpdateResult = (result: unknown, definition: RuntimeProgramToken): NormalizedUpdateResult => {
  if (typeof result !== 'object' || result === null) {
    throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, result);
  }
  let kind: unknown;
  try {
    kind = Reflect.get(result, 'kind');
  } catch (cause) {
    throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, cause);
  }
  if (kind === 'bailout') return Object.freeze({ kind });
  if (kind === 'incremental') {
    let hasArtifact: boolean;
    let artifact: unknown;
    try {
      hasArtifact = Object.prototype.hasOwnProperty.call(result, 'artifact');
      artifact = hasArtifact ? Reflect.get(result, 'artifact') : undefined;
    } catch (cause) {
      throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, cause);
    }
    if (hasArtifact) return Object.freeze({ kind, artifact });
  }
  if (kind === 'fallback') {
    let fallbackDiagnostics: unknown;
    try {
      fallbackDiagnostics = Reflect.get(result, 'diagnostics');
    } catch (cause) {
      throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, cause);
    }
    if (fallbackDiagnostics === undefined) return Object.freeze({ kind });
    if (Array.isArray(fallbackDiagnostics)) {
      const diagnostics: Array<Readonly<{ code: string; phase: string; message: string }>> = [];
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
          if (typeof code !== 'string' || typeof diagnosticPhase !== 'string' || typeof message !== 'string') {
            invalidDiagnostic = true;
            break;
          }
          diagnostics.push(Object.freeze({ code, phase: diagnosticPhase, message }));
        }
      } catch (cause) {
        throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, cause);
      }
      if (invalidDiagnostic) throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, result);
      return Object.freeze({ kind, diagnostics: Object.freeze(diagnostics) });
    }
  }
  throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, result);
};

/** 捕获 artifact 并拒绝会把 current disposable artifact 重新交给 Runtime 的 alias */
const prepareProgramArtifact = (
  definition: RuntimeProgramToken,
  executor: RuntimeProgramErasedExecutor,
  input: unknown,
  previous?: RuntimeProgramState,
  diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
): RuntimePreparedProgramArtifact<unknown, unknown, unknown> => {
  let prepared: RuntimePreparedProgramArtifact<unknown, unknown, unknown>;
  try {
    prepared = executor.prepareArtifact(input, previous?.prepared);
  } catch (cause) {
    if (cause instanceof RuntimeError) {
      throw withFailureDiagnostics(cause, Object.freeze([...diagnostics, ...cause.diagnostics]));
    }
    throw cause;
  }
  return prepared;
};

/** 校验 registry identity 并按 owner 顺序准备初始 values */
const prepareInitialOwners = (
  owners: RuntimeOwnerRegistry,
  initialSnapshots: RuntimeSessionOptions['initialSnapshots'],
  executor: RuntimeOwnerExecutor,
): Map<RuntimeOwnerToken, RuntimeOwnerState> => {
  if (!Array.isArray(initialSnapshots)) {
    throw sessionError('RUNTIME_INITIAL_OWNER_MISMATCH', 'initial', initialSnapshots);
  }
  const commands = new Map<RuntimeOwnerToken, RuntimeOwnerCommandExecutor>();
  for (const command of initialSnapshots) {
    const commandExecutor = getRuntimeOwnerCommandExecutor(command);
    if (command.kind !== 'initial') {
      throw sessionError('RUNTIME_OWNER_COMMAND_INVALID', 'initial', command);
    }
    if (owners.find(command.owner.key) !== command.owner || commands.has(command.owner)) {
      throw sessionError('RUNTIME_INITIAL_OWNER_MISMATCH', 'initial', command, command.owner.key);
    }
    commands.set(command.owner, commandExecutor);
  }
  if (commands.size !== owners.definitions().length) {
    throw sessionError('RUNTIME_INITIAL_OWNER_MISMATCH', 'initial', initialSnapshots);
  }

  const states = new Map<RuntimeOwnerToken, RuntimeOwnerState>();
  try {
    for (const owner of owners.definitions()) {
      const command = commands.get(owner);
      if (command === undefined) {
        throw sessionError('RUNTIME_INITIAL_OWNER_MISMATCH', 'initial', owner, owner.key);
      }
      states.set(owner, Object.freeze({ command, prepared: command.prepare(executor).value }));
    }
  } catch (cause) {
    const diagnostics = [...errorDiagnostics(cause)];
    for (const owner of [...owners.definitions()].reverse()) {
      const ownerState = states.get(owner);
      if (ownerState !== undefined) {
        diagnostics.push(
          ...ownerState.command.retire(executor, ownerState.prepared).diagnostics.map(mapOwnerLifecycleDiagnostic),
        );
      }
    }
    throw withFailureDiagnostics(cause, Object.freeze(diagnostics));
  }
  return states;
};

/** 为当前 Program 构造只允许已声明依赖的 typed candidate view */
const createCandidateView = (
  phase: 'initial' | 'update',
  baseRevision: RuntimeRevision | undefined,
  candidateRevision: RuntimeRevision,
  ownerStates: ReadonlyMap<RuntimeOwnerToken, RuntimeOwnerState>,
  changedOwners: ReadonlySet<RuntimeOwnerToken>,
  changeSets: ReadonlyMap<RuntimeOwnerToken, RuntimeOwnerCommandExecutor>,
  programStates: ReadonlyMap<RuntimeProgramToken, RuntimeProgramState>,
  program: RuntimeProgramToken,
  executor: RuntimeProgramErasedExecutor,
  invocationErrors: WeakSet<RuntimeError>,
): RuntimeCandidateView => {
  const declaredOwners = new Set(executor.owners);
  const declaredPrograms = new Set(executor.programs);
  const candidateError = (
    candidatePhase: 'candidate-read' | 'candidate-change' | 'candidate-artifact',
    cause: unknown,
    owner: string,
  ) => {
    const error = sessionError('RUNTIME_UNDECLARED_DEPENDENCY', candidatePhase, cause, owner);
    invocationErrors.add(error);
    return error;
  };
  const lookup: RuntimeCandidateLookup = Object.freeze({
    snapshot: <TInput, TValue, TRead, TChange>(owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>) => {
      if (!declaredOwners.has(owner)) {
        throw candidateError('candidate-read', owner, owner.key);
      }
      const state = ownerStates.get(owner);
      if (state === undefined) {
        throw candidateError('candidate-read', owner, owner.key);
      }
      return state.command.snapshot(owner, state.prepared, candidateRevision);
    },
    changed: owner => {
      if (!declaredOwners.has(owner)) {
        throw candidateError('candidate-change', owner, owner.key);
      }
      return changedOwners.has(owner);
    },
    changeSet: <TInput, TValue, TRead, TChange>(owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>) => {
      if (!declaredOwners.has(owner)) {
        throw candidateError('candidate-change', owner, owner.key);
      }
      return changeSets.get(owner)?.changeSet(owner);
    },
    artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
      dependency: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
    ): RuntimeSnapshot<TPublicRead> => {
      if (!declaredPrograms.has(dependency)) {
        throw candidateError('candidate-artifact', dependency, program.id.owner);
      }
      const state = programStates.get(dependency);
      if (state === undefined) {
        throw candidateError('candidate-artifact', dependency, program.id.owner);
      }
      return state.executor.snapshot(dependency, state.prepared, candidateRevision);
    },
  });
  return phase === 'initial'
    ? Object.freeze({ ...lookup, phase, candidateRevision })
    : Object.freeze({
        ...lookup,
        phase,
        baseRevision: baseRevision ?? candidateRevision,
        candidateRevision,
      });
};

/** 运行一个 Program callback 并捕获 artifact 双层 read */
const runProgram = (
  phase: 'initial' | 'update',
  baseRevision: RuntimeRevision | undefined,
  candidateRevision: RuntimeRevision,
  ownerStates: ReadonlyMap<RuntimeOwnerToken, RuntimeOwnerState>,
  changedOwners: ReadonlySet<RuntimeOwnerToken>,
  changeSets: ReadonlyMap<RuntimeOwnerToken, RuntimeOwnerCommandExecutor>,
  programStates: ReadonlyMap<RuntimeProgramToken, RuntimeProgramState>,
  definition: RuntimeProgramToken,
  executor: RuntimeProgramErasedExecutor,
  trace: RuntimeSessionOptions['trace'],
  mode: 'full' | 'incremental' | 'fallback',
  previous?: RuntimeProgramState,
): Readonly<{
  state?: RuntimeProgramState;
  outcome?: RuntimeProgramOutcome;
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}> => {
  /** 只信任当前 callback invocation 内由 CandidateView 产生的 contract error */
  const invocationErrors = new WeakSet<RuntimeError>();
  const view = createCandidateView(
    phase,
    baseRevision,
    candidateRevision,
    ownerStates,
    changedOwners,
    changeSets,
    programStates,
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
  const context = Object.freeze({
    trace: Object.freeze({ owner: traceReporter.owner, report: traceReporter.report }),
    diagnose: (diagnostic: Readonly<{ code: string; phase: string; message: string }>) => {
      drainTraceDiagnostics();
      const candidate: unknown = diagnostic;
      if (typeof candidate !== 'object' || candidate === null) {
        throw new Error('runtime Program diagnostic input is invalid');
      }
      const code = Reflect.get(candidate, 'code');
      const diagnosticPhase = Reflect.get(candidate, 'phase');
      const message = Reflect.get(candidate, 'message');
      if (typeof code !== 'string' || typeof diagnosticPhase !== 'string' || typeof message !== 'string') {
        throw new Error('runtime Program diagnostic input is invalid');
      }
      diagnostics.push(
        Object.freeze({
          code,
          phase: diagnosticPhase,
          message,
          severity: 'warning' as const,
          owner: definition.id.owner,
          program: definition.id,
        }),
      );
    },
  });

  if (mode === 'incremental' && executor.update !== undefined && previous !== undefined) {
    let callbackResult;
    try {
      callbackResult = executor.update<unknown, unknown>(previous.prepared.programRead, view, context);
    } catch (cause) {
      drainTraceDiagnostics();
      if (cause instanceof RuntimeError && invocationErrors.has(cause)) {
        throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
      }
      throw programError('RUNTIME_PROGRAM_UPDATE_FAILED', 'update', definition, cause, executionDiagnostics);
    }
    drainTraceDiagnostics();
    let result: NormalizedUpdateResult;
    try {
      result = normalizeUpdateResult(callbackResult, definition);
    } catch (cause) {
      if (cause instanceof RuntimeError) {
        throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
      }
      throw cause;
    }
    if (result.kind === 'bailout') {
      return Object.freeze({ diagnostics: Object.freeze([...diagnostics]) });
    }
    if (result.kind === 'incremental') {
      return Object.freeze({
        state: Object.freeze({
          definition,
          executor,
          prepared: prepareProgramArtifact(definition, executor, result.artifact, previous, executionDiagnostics),
        }),
        outcome: 'incremental' as const,
        diagnostics: Object.freeze([...diagnostics]),
      });
    }
    for (const diagnostic of result.diagnostics ?? []) context.diagnose(diagnostic);
  }

  let callbackResult;
  try {
    callbackResult = executor.run<unknown>(view, context);
  } catch (cause) {
    drainTraceDiagnostics();
    if (cause instanceof RuntimeError && invocationErrors.has(cause)) {
      throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
    }
    throw programError('RUNTIME_PROGRAM_RUN_FAILED', 'run', definition, cause, executionDiagnostics);
  }
  drainTraceDiagnostics();
  let result: NormalizedRunResult;
  try {
    result = normalizeRunResult(callbackResult, definition);
  } catch (cause) {
    if (cause instanceof RuntimeError) {
      throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
    }
    throw cause;
  }
  return Object.freeze({
    state: Object.freeze({
      definition,
      executor,
      prepared: prepareProgramArtifact(definition, executor, result.artifact, previous, executionDiagnostics),
    }),
    outcome: mode === 'incremental' || mode === 'fallback' ? ('fallback' as const) : ('full' as const),
    diagnostics: Object.freeze([...diagnostics]),
  });
};

/** 创建同步 Snapshot transaction session */
export const createRuntimeSession = (options: RuntimeSessionOptions): RuntimeSession => {
  const optionsCandidate: unknown = options;
  if (typeof optionsCandidate !== 'object' || optionsCandidate === null) {
    throw sessionError('RUNTIME_REGISTRY_MISMATCH', 'session-create', optionsCandidate);
  }
  let programOwners: RuntimeOwnerRegistry;
  try {
    programOwners = getRuntimeProgramOwnerRegistry(options.programs);
  } catch (cause) {
    throw sessionError('RUNTIME_REGISTRY_MISMATCH', 'session-create', cause);
  }
  if (programOwners !== options.owners) {
    throw sessionError('RUNTIME_REGISTRY_MISMATCH', 'session-create', options.programs);
  }
  const participantCandidates: unknown = Reflect.get(optionsCandidate, 'participants');
  if (participantCandidates !== undefined && !Array.isArray(participantCandidates)) {
    throw sessionError('RUNTIME_PARTICIPANT_TOKEN_INVALID', 'session-create', participantCandidates);
  }
  const participantsInput: ReadonlyArray<unknown> = participantCandidates ?? [];
  const participantExecutors = new Map<RuntimeCommitParticipantToken, RuntimeCommitParticipantExecutor>();
  const participantKeys = new Set<string>();
  const participants: Array<RuntimeCommitParticipantToken> = [];
  for (const participantCandidate of participantsInput) {
    if (!isRuntimeCommitParticipant(participantCandidate)) {
      throw sessionError('RUNTIME_PARTICIPANT_TOKEN_INVALID', 'session-create', participantCandidate);
    }
    const participant = participantCandidate;
    if (participantKeys.has(participant.key)) {
      throw sessionError('RUNTIME_PARTICIPANT_DUPLICATE', 'session-create', participant, participant.key);
    }
    participantKeys.add(participant.key);
    const ownerDependencies = new Set<RuntimeOwnerToken>();
    for (const owner of participant.owners) {
      if (ownerDependencies.has(owner) || options.owners.find(owner.key) !== owner) {
        throw sessionError('RUNTIME_PARTICIPANT_DEPENDENCY_INVALID', 'session-create', owner, participant.key);
      }
      ownerDependencies.add(owner);
    }
    const programDependencies = new Set<RuntimeProgramToken>();
    for (const program of participant.programs) {
      if (programDependencies.has(program)) {
        throw sessionError('RUNTIME_PARTICIPANT_DEPENDENCY_INVALID', 'session-create', program, participant.key);
      }
      try {
        if (options.programs.find(program.id) !== program) {
          throw new Error('participant Program dependency is not registered');
        }
      } catch {
        throw sessionError('RUNTIME_PARTICIPANT_DEPENDENCY_INVALID', 'session-create', program, participant.key);
      }
      programDependencies.add(program);
    }
    const executor = getRuntimeCommitParticipantExecutor(participant);
    if (executor === undefined) {
      throw sessionError('RUNTIME_PARTICIPANT_TOKEN_INVALID', 'session-create', participant, participant.key);
    }
    participants.push(participant);
    participantExecutors.set(participant, executor);
  }
  participants.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  Object.freeze(participants);
  const alreadyOwnedParticipant = claimRuntimeCommitParticipants(participants);
  if (alreadyOwnedParticipant !== undefined) {
    throw sessionError(
      'RUNTIME_PARTICIPANT_ALREADY_OWNED',
      'session-create',
      alreadyOwnedParticipant,
      alreadyOwnedParticipant.key,
    );
  }
  const ownerExecutor = createRuntimeOwnerExecutor(options.owners);
  let ownerStates = new Map<RuntimeOwnerToken, RuntimeOwnerState>();
  let programStates = new Map<RuntimeProgramToken, RuntimeProgramState>();
  let currentRevision = createRuntimeRevision(0);
  let state: RuntimeSessionState = 'preparing';
  let brokenError: RuntimeError | undefined;
  let diagnosticQueue: Array<RuntimeDiagnostic> = [];
  const initialDiagnostics: Array<RuntimeDiagnostic> = [];
  const initialParticipantDiagnostics: Array<RuntimeDiagnostic> = [];
  const preparedParticipants = new Map<RuntimeCommitParticipantToken, RuntimePreparedParticipantState>();
  const participantDrains = new Map<RuntimeCommitParticipantToken, () => ReadonlyArray<RuntimeDiagnostic>>();
  let participantReads = new Map<RuntimeCommitParticipantToken, unknown>();
  const pendingParticipantDisposals = new Set(participants);
  let sessionResourcesRetired = false;

  try {
    ownerStates = prepareInitialOwners(options.owners, options.initialSnapshots, ownerExecutor);
    for (const definition of options.programs.definitions()) {
      const executor = getRuntimeProgramRegistryExecutor(options.programs, definition);
      const prepared = runProgram(
        'initial',
        undefined,
        currentRevision,
        ownerStates,
        new Set(options.owners.definitions()),
        new Map(),
        programStates,
        definition,
        executor,
        options.trace,
        'full',
      );
      if (prepared.state === undefined) throw new Error('runtime session: initial Program returned no artifact');
      programStates.set(definition, prepared.state);
      initialDiagnostics.push(...prepared.diagnostics);
    }
    for (const participant of participants) {
      const executor = participantExecutors.get(participant);
      if (executor === undefined) throw new Error('runtime session: missing participant executor');
      const invocationErrors = new WeakSet<RuntimeError>();
      const declaredOwners = new Set(participant.owners);
      const declaredPrograms = new Set(participant.programs);
      const view = Object.freeze({
        phase: 'initial' as const,
        candidateRevision: currentRevision,
        snapshot: <TInput, TValue, TRead, TChange>(
          owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
        ): RuntimeSnapshot<TRead> => {
          if (!declaredOwners.has(owner)) {
            const error = sessionError('RUNTIME_UNDECLARED_DEPENDENCY', 'participant-snapshot', owner, participant.key);
            invocationErrors.add(error);
            throw error;
          }
          const ownerState = ownerStates.get(owner);
          if (ownerState === undefined) {
            const error = sessionError('RUNTIME_UNDECLARED_DEPENDENCY', 'participant-snapshot', owner, participant.key);
            invocationErrors.add(error);
            throw error;
          }
          return ownerState.command.snapshot(owner, ownerState.prepared, currentRevision);
        },
        artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
          program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
        ): RuntimeSnapshot<TPublicRead> => {
          if (!declaredPrograms.has(program)) {
            const error = sessionError(
              'RUNTIME_UNDECLARED_DEPENDENCY',
              'participant-artifact',
              program,
              participant.key,
            );
            invocationErrors.add(error);
            throw error;
          }
          const programState = programStates.get(program);
          if (programState === undefined) {
            const error = sessionError(
              'RUNTIME_UNDECLARED_DEPENDENCY',
              'participant-artifact',
              program,
              participant.key,
            );
            invocationErrors.add(error);
            throw error;
          }
          return programState.executor.snapshot(program, programState.prepared, currentRevision);
        },
      });
      const invocation = createParticipantInvocation(participant, options.trace);
      participantDrains.set(participant, invocation.takeDiagnostics);
      let preparedCandidate: unknown;
      try {
        preparedCandidate = executor.prepare(view, invocation.context);
      } catch (cause) {
        initialParticipantDiagnostics.push(...invocation.takeDiagnostics());
        if (cause instanceof RuntimeError && invocationErrors.has(cause)) throw cause;
        throw participantError('RUNTIME_PARTICIPANT_PREPARE_FAILED', 'prepare', participant, cause);
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
        throw participantError('RUNTIME_PARTICIPANT_COMMIT_FAILED', 'commit', participant, cause);
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
          throw participantError('RUNTIME_PARTICIPANT_READ_FAILED', 'read', participant, cause);
        }
        initialParticipantDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
      }
    }
    participantReads = candidateReads;
  } catch (cause) {
    const failedDiagnostics: Array<RuntimeDiagnostic> = [
      ...initialDiagnostics.filter(isExecutionDiagnostic),
      ...initialParticipantDiagnostics,
      ...(cause instanceof RuntimeError ? cause.diagnostics : []),
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
              'RUNTIME_PARTICIPANT_ROLLBACK_FAILED',
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
              'RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED',
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
            'RUNTIME_PARTICIPANT_DISPOSE_FAILED',
            'participant-dispose',
            participant,
            participantDisposeFailure.cause,
          ),
        );
      }
      consumeRuntimeCommitParticipant(participant);
    }
    participantReads.clear();
    for (const definition of [...options.programs.definitions()].reverse()) {
      const prepared = programStates.get(definition);
      if (prepared !== undefined) failedDiagnostics.push(...prepared.executor.retire(prepared.prepared));
    }
    for (const owner of [...options.owners.definitions()].reverse()) {
      const prepared = ownerStates.get(owner);
      if (prepared !== undefined) {
        failedDiagnostics.push(
          ...prepared.command.retire(ownerExecutor, prepared.prepared).diagnostics.map(mapOwnerLifecycleDiagnostic),
        );
      }
    }
    throw withFailureDiagnostics(cause, Object.freeze(failedDiagnostics));
  }

  const assertIdle = (phase: string): void => {
    if (state === 'dispose-pending' || state === 'disposed') {
      throw sessionError('RUNTIME_SESSION_DISPOSED', phase, undefined);
    }
    if (state === 'broken') {
      throw sessionError('RUNTIME_PARTICIPANT_ROLLBACK_FAILED', phase, brokenError, brokenError?.owner);
    }
    if (state !== 'idle') throw sessionError('RUNTIME_SESSION_REENTRANT', phase, state);
  };

  const session: RuntimeSession = Object.freeze({
    revision: () => currentRevision,
    update: (update: RuntimeSessionUpdate): RuntimeSessionResult => {
      assertIdle('update');
      state = 'preparing';
      const updateState = { broken: false };
      try {
        const updateCandidate: unknown = update;
        if (typeof updateCandidate !== 'object' || updateCandidate === null) {
          throw sessionError('RUNTIME_REVISION_INVALID', 'update', updateCandidate);
        }
        if (!isRuntimeRevision(update.baseRevision)) {
          throw sessionError('RUNTIME_REVISION_INVALID', 'update', update.baseRevision);
        }
        if (update.baseRevision !== currentRevision) {
          throw sessionError('RUNTIME_REVISION_STALE', 'update', update.baseRevision);
        }
        if (!Array.isArray(update.owners)) {
          throw sessionError('RUNTIME_OWNER_COMMAND_INVALID', 'update', update.owners);
        }
        if (update.owners.length === 0) {
          return Object.freeze({ revision: currentRevision, outcome: 'bailout', diagnostics: Object.freeze([]) });
        }

        const commands = new Map<RuntimeOwnerToken, RuntimeOwnerCommandExecutor>();
        for (const command of update.owners) {
          const executor = getRuntimeOwnerCommandExecutor(command);
          if (command.kind !== 'update' || options.owners.find(command.owner.key) !== command.owner) {
            throw sessionError('RUNTIME_OWNER_COMMAND_INVALID', 'update', command, command.owner.key);
          }
          if (commands.has(command.owner)) {
            throw sessionError('RUNTIME_OWNER_COMMAND_INVALID', 'update', command, command.owner.key);
          }
          commands.set(command.owner, executor);
        }
        for (const [owner, executor] of commands) {
          if (executor.changeSetBaseRevision !== undefined && executor.changeSetBaseRevision !== update.baseRevision) {
            throw sessionError(
              'RUNTIME_CHANGESET_REVISION_MISMATCH',
              'change-set',
              executor.changeSetBaseRevision,
              owner.key,
            );
          }
        }
        const candidateRevision = createNextRuntimeRevision(currentRevision);

        const nextOwnerStates = new Map(ownerStates);
        const changedOwners = new Set<RuntimeOwnerToken>();
        const invalidChangeOwners = new Set<RuntimeOwnerToken>();
        const changeSets = new Map<RuntimeOwnerToken, RuntimeOwnerCommandExecutor>();
        const candidateDiagnostics: Array<RuntimeDiagnostic> = [];
        const preparedOwnerCandidates = new Map<RuntimeOwnerToken, RuntimeOwnerState>();
        try {
          for (const owner of options.owners.definitions()) {
            const command = commands.get(owner);
            if (command === undefined) continue;
            const previous = ownerStates.get(owner);
            if (previous === undefined) throw new Error(`runtime session: missing owner state "${owner.key}"`);
            const candidate = command.prepare(ownerExecutor, previous.prepared).value;
            const candidateState = Object.freeze({ command, prepared: candidate });
            preparedOwnerCandidates.set(owner, candidateState);
            if (command.compare(ownerExecutor, previous.prepared, candidate).value) {
              candidateDiagnostics.push(
                ...command.retire(ownerExecutor, candidate).diagnostics.map(mapOwnerLifecycleDiagnostic),
              );
              preparedOwnerCandidates.delete(owner);
              continue;
            }
            if (command.validateChangeSet !== undefined) {
              let validation: 'valid' | 'fallback';
              try {
                validation = command.validateChangeSet(ownerExecutor, previous.prepared, candidate).value;
              } catch (cause) {
                preparedOwnerCandidates.delete(owner);
                throw cause;
              }
              if (validation === 'valid') changeSets.set(owner, command);
              else {
                invalidChangeOwners.add(owner);
                candidateDiagnostics.push(
                  Object.freeze({
                    code: 'RUNTIME_CHANGESET_FALLBACK',
                    phase: 'validate-change-set',
                    severity: 'warning',
                    message: `Runtime change hint for owner "${owner.key}" could not be validated`,
                    owner: owner.key,
                  }),
                );
              }
            }
            nextOwnerStates.set(owner, candidateState);
            changedOwners.add(owner);
          }
        } catch (cause) {
          const failedDiagnostics = [...candidateDiagnostics.filter(isExecutionDiagnostic), ...errorDiagnostics(cause)];
          for (const owner of [...options.owners.definitions()].reverse()) {
            const candidate = preparedOwnerCandidates.get(owner);
            if (candidate !== undefined) {
              failedDiagnostics.push(
                ...candidate.command
                  .retire(ownerExecutor, candidate.prepared)
                  .diagnostics.map(mapOwnerLifecycleDiagnostic),
              );
            }
          }
          const frozenFailedDiagnostics = Object.freeze(failedDiagnostics);
          diagnosticQueue.push(...frozenFailedDiagnostics);
          throw withFailureDiagnostics(cause, frozenFailedDiagnostics);
        }
        if (changedOwners.size === 0) {
          const bailoutDiagnostics = Object.freeze([...candidateDiagnostics]);
          diagnosticQueue.push(...bailoutDiagnostics);
          return Object.freeze({
            revision: currentRevision,
            outcome: 'bailout',
            diagnostics: bailoutDiagnostics,
          });
        }

        const nextProgramStates = new Map(programStates);
        const programOutcomes = new Map<RuntimeProgramToken, RuntimeProgramOutcome>();
        const candidateParticipantDiagnostics: Array<RuntimeDiagnostic> = [];
        const selectedParticipants: Array<RuntimeCommitParticipantToken> = [];
        const preparedUpdateParticipants = new Map<RuntimeCommitParticipantToken, RuntimePreparedParticipantState>();
        const nextParticipantReads = new Map(participantReads);
        try {
          for (const definition of options.programs.definitions()) {
            const executor = getRuntimeProgramRegistryExecutor(options.programs, definition);
            const directOwnerChange = executor.owners.some(owner => changedOwners.has(owner));
            const directInvalidHint = executor.owners.some(owner => invalidChangeOwners.has(owner));
            const upstreamOutcomes = executor.programs
              .map(program => programOutcomes.get(program))
              .filter((outcome): outcome is RuntimeProgramOutcome => outcome !== undefined);
            if (!directOwnerChange && upstreamOutcomes.length === 0) continue;
            const forceFull = upstreamOutcomes.some(outcome => outcome === 'full' || outcome === 'fallback');
            const previous = programStates.get(definition);
            if (previous === undefined) throw new Error('runtime session: missing committed Program state');
            const prepared = runProgram(
              'update',
              currentRevision,
              candidateRevision,
              nextOwnerStates,
              changedOwners,
              changeSets,
              nextProgramStates,
              definition,
              executor,
              options.trace,
              directInvalidHint ? 'fallback' : forceFull || executor.update === undefined ? 'full' : 'incremental',
              previous,
            );
            candidateDiagnostics.push(...prepared.diagnostics);
            if (prepared.state === undefined || prepared.outcome === undefined) continue;
            nextProgramStates.set(definition, prepared.state);
            programOutcomes.set(definition, prepared.outcome);
          }
          for (const participant of participants) {
            const isAffected =
              participant.owners.some(owner => changedOwners.has(owner)) ||
              participant.programs.some(program => programOutcomes.has(program));
            if (participant.revisionPolicy !== 'continuous' && !isAffected) continue;
            selectedParticipants.push(participant);
            const executor = participantExecutors.get(participant);
            if (executor === undefined) throw new Error('runtime session: missing participant executor');
            const invocationErrors = new WeakSet<RuntimeError>();
            const declaredOwners = new Set(participant.owners);
            const declaredPrograms = new Set(participant.programs);
            const view = Object.freeze({
              phase: 'update' as const,
              baseRevision: currentRevision,
              candidateRevision,
              snapshot: <TInput, TValue, TRead, TChange>(
                owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
              ): RuntimeSnapshot<TRead> => {
                if (!declaredOwners.has(owner)) {
                  const error = sessionError(
                    'RUNTIME_UNDECLARED_DEPENDENCY',
                    'participant-snapshot',
                    owner,
                    participant.key,
                  );
                  invocationErrors.add(error);
                  throw error;
                }
                const ownerState = nextOwnerStates.get(owner);
                if (ownerState === undefined) {
                  const error = sessionError(
                    'RUNTIME_UNDECLARED_DEPENDENCY',
                    'participant-snapshot',
                    owner,
                    participant.key,
                  );
                  invocationErrors.add(error);
                  throw error;
                }
                return ownerState.command.snapshot(owner, ownerState.prepared, candidateRevision);
              },
              artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
                program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
              ): RuntimeSnapshot<TPublicRead> => {
                if (!declaredPrograms.has(program)) {
                  const error = sessionError(
                    'RUNTIME_UNDECLARED_DEPENDENCY',
                    'participant-artifact',
                    program,
                    participant.key,
                  );
                  invocationErrors.add(error);
                  throw error;
                }
                const programState = nextProgramStates.get(program);
                if (programState === undefined) {
                  const error = sessionError(
                    'RUNTIME_UNDECLARED_DEPENDENCY',
                    'participant-artifact',
                    program,
                    participant.key,
                  );
                  invocationErrors.add(error);
                  throw error;
                }
                return programState.executor.snapshot(program, programState.prepared, candidateRevision);
              },
            });
            const invocation = createParticipantInvocation(participant, options.trace);
            participantDrains.set(participant, invocation.takeDiagnostics);
            let preparedCandidate: unknown;
            try {
              preparedCandidate = executor.prepare(view, invocation.context);
            } catch (cause) {
              candidateParticipantDiagnostics.push(...invocation.takeDiagnostics());
              if (cause instanceof RuntimeError && invocationErrors.has(cause)) throw cause;
              throw participantError('RUNTIME_PARTICIPANT_PREPARE_FAILED', 'prepare', participant, cause);
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
              throw participantError('RUNTIME_PARTICIPANT_COMMIT_FAILED', 'commit', participant, cause);
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
                throw participantError('RUNTIME_PARTICIPANT_READ_FAILED', 'read', participant, cause);
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
            ...(cause instanceof RuntimeError ? cause.diagnostics : []),
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
                    'RUNTIME_PARTICIPANT_ROLLBACK_FAILED',
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
                  'RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED',
                  'token-dispose',
                  participant,
                  disposeCause,
                ),
              );
            }
          }
          for (const definition of [...options.programs.definitions()].reverse()) {
            const candidate = nextProgramStates.get(definition);
            const previous = programStates.get(definition);
            if (candidate !== undefined && candidate !== previous) {
              failedDiagnostics.push(...candidate.executor.retire(candidate.prepared));
            }
          }
          for (const owner of [...options.owners.definitions()].reverse()) {
            if (!changedOwners.has(owner)) continue;
            const candidate = nextOwnerStates.get(owner);
            const previous = ownerStates.get(owner);
            if (candidate !== undefined && candidate !== previous) {
              failedDiagnostics.push(
                ...candidate.command
                  .retire(ownerExecutor, candidate.prepared)
                  .diagnostics.map(mapOwnerLifecycleDiagnostic),
              );
            }
          }
          const frozenFailedDiagnostics = Object.freeze(failedDiagnostics);
          diagnosticQueue.push(...frozenFailedDiagnostics);
          if (firstRollbackFailure !== undefined) {
            brokenError = new RuntimeError({
              code: 'RUNTIME_PARTICIPANT_ROLLBACK_FAILED',
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

        const previousOwnerStates = ownerStates;
        const previousProgramStates = programStates;
        candidateDiagnostics.push(...candidateParticipantDiagnostics);
        ownerStates = nextOwnerStates;
        programStates = nextProgramStates;
        participantReads = nextParticipantReads;
        const baseRevision = currentRevision;
        currentRevision = candidateRevision;
        const frozenDiagnostics = Object.freeze([...candidateDiagnostics]);

        state = 'observing';
        for (const definition of options.programs.definitions()) {
          const outcome = programOutcomes.get(definition);
          if (outcome === undefined) continue;
          const programState = programStates.get(definition);
          if (programState === undefined || programState.executor.observeCommit === undefined) continue;
          const event: RuntimeCommitEvent<unknown> = Object.freeze({
            phase: 'update',
            baseRevision,
            revision: currentRevision,
            outcome,
            artifact: programState.executor.snapshotToken(definition, programState.prepared, currentRevision),
            diagnostics: frozenDiagnostics,
          });
          try {
            programState.executor.observeCommit<unknown>(event);
          } catch (cause) {
            candidateDiagnostics.push(observerDiagnostic(definition, cause));
          }
        }

        state = 'retiring';
        for (const definition of [...options.programs.definitions()].reverse()) {
          if (!programOutcomes.has(definition)) continue;
          const previous = previousProgramStates.get(definition);
          if (previous !== undefined) candidateDiagnostics.push(...previous.executor.retire(previous.prepared));
        }
        for (const owner of [...options.owners.definitions()].reverse()) {
          if (!changedOwners.has(owner)) continue;
          const previous = previousOwnerStates.get(owner);
          if (previous !== undefined) {
            candidateDiagnostics.push(
              ...previous.command.retire(ownerExecutor, previous.prepared).diagnostics.map(mapOwnerLifecycleDiagnostic),
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
                'RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED',
                'token-dispose',
                participant,
                cause,
              ),
            );
          }
        }

        const resultDiagnostics = Object.freeze([...candidateDiagnostics]);
        diagnosticQueue.push(...resultDiagnostics);
        const outcome: RuntimeSessionResult['outcome'] = [...programOutcomes.values()].includes('fallback')
          ? 'fallback'
          : [...programOutcomes.values()].includes('full')
            ? 'full'
            : [...programOutcomes.values()].includes('incremental')
              ? 'incremental'
              : 'committed';
        return Object.freeze({ revision: currentRevision, outcome, diagnostics: resultDiagnostics });
      } finally {
        if (!updateState.broken) state = 'idle';
      }
    },
    snapshot: <TInput, TValue, TRead, TChange>(owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>) => {
      assertIdle('snapshot');
      options.owners.resolve(owner);
      const ownerState = ownerStates.get(owner);
      if (ownerState === undefined) throw sessionError('RUNTIME_OWNER_COMMAND_INVALID', 'snapshot', owner, owner.key);
      return ownerState.command.snapshot(owner, ownerState.prepared, currentRevision);
    },
    artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
      program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
    ): RuntimeSnapshot<TPublicRead> => {
      assertIdle('artifact');
      options.programs.resolve(program);
      const programState = programStates.get(program);
      if (programState === undefined) throw sessionError('RUNTIME_UNDECLARED_DEPENDENCY', 'artifact', program);
      return programState.executor.snapshot(program, programState.prepared, currentRevision);
    },
    participant: <TRead>(participant: RuntimeCommitParticipant<TRead>): TRead => {
      const participantCandidate: unknown = participant;
      if (!isRuntimeCommitParticipant(participantCandidate)) {
        throw sessionError('RUNTIME_PARTICIPANT_TOKEN_INVALID', 'participant', participantCandidate);
      }
      if (!participantExecutors.has(participant)) {
        throw sessionError('RUNTIME_PARTICIPANT_UNKNOWN', 'participant', participant, participant.key);
      }
      assertIdle('participant');
      return participantReads.get(participant) as TRead;
    },
    diagnostics: () => {
      if (state !== 'idle' && state !== 'broken' && state !== 'dispose-pending' && state !== 'disposed') {
        throw sessionError('RUNTIME_SESSION_REENTRANT', 'diagnostics', state);
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
                'RUNTIME_PARTICIPANT_DISPOSE_FAILED',
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
      if (!sessionResourcesRetired) {
        participantReads.clear();
        for (const definition of [...options.programs.definitions()].reverse()) {
          const programState = programStates.get(definition);
          if (programState !== undefined) diagnosticQueue.push(...programState.executor.retire(programState.prepared));
        }
        for (const owner of [...options.owners.definitions()].reverse()) {
          const ownerState = ownerStates.get(owner);
          if (ownerState !== undefined) {
            diagnosticQueue.push(
              ...ownerState.command
                .retire(ownerExecutor, ownerState.prepared)
                .diagnostics.map(mapOwnerLifecycleDiagnostic),
            );
          }
        }
        sessionResourcesRetired = true;
        if (pendingParticipantDisposals.size > 0) disposePendingParticipants();
      }
      state = pendingParticipantDisposals.size > 0 ? 'dispose-pending' : 'disposed';
    },
  });

  initialDiagnostics.push(...initialParticipantDiagnostics);
  const frozenInitialDiagnostics = Object.freeze([...initialDiagnostics]);
  const completedInitialDiagnostics = [...initialDiagnostics];
  state = 'observing';
  for (const definition of options.programs.definitions()) {
    const programState = programStates.get(definition);
    if (programState === undefined || programState.executor.observeCommit === undefined) continue;
    const event: RuntimeCommitEvent<unknown> = Object.freeze({
      phase: 'initial',
      revision: currentRevision,
      outcome: 'full',
      artifact: programState.executor.snapshotToken(definition, programState.prepared, currentRevision),
      diagnostics: frozenInitialDiagnostics,
    });
    try {
      programState.executor.observeCommit<unknown>(event);
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
        participantLifecycleDiagnostic('RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED', 'token-dispose', participant, cause),
      );
    }
  }
  diagnosticQueue.push(...completedInitialDiagnostics);
  state = 'idle';
  return session;
};
