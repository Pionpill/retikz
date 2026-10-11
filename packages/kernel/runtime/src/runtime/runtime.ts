import type {
  RuntimeCandidateLookup,
  RuntimeCandidateView,
  RuntimeCommitEvent,
  RuntimePreparedComputationResult,
  RuntimeComputationContext,
  RuntimeComputationDefinition,
  RuntimeComputationErasedExecutor,
  RuntimeComputationToken,
  RuntimeUpdateOutcome,
} from '../computation';
import { RuntimeComputationExecution, RuntimeComputationKind, RuntimeComputationPhase } from '../computation';
import type { RuntimeDiagnostic, RuntimeDiagnosticPhase } from '../diagnostic';
import { RuntimeDiagnosticCode } from '../diagnostic';
import { getRuntimeDiagnosticMessage, RuntimeTraceDiagnosticCodes } from '../diagnostic/internal';
import type { RuntimeSourceLifecycleDiagnostic } from '../error';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeCommitParticipant, RuntimeCommitParticipantToken } from '../participant';
import type { RuntimeCommitParticipantExecutor } from '../participant/internal';
import {
  claimRuntimeCommitParticipants,
  consumeRuntimeCommitParticipant,
  getRuntimeCommitParticipantExecutor,
  isRuntimeCommitParticipant,
} from '../participant/internal';
import type { RuntimeSourceRegistry } from '../registry';
import { getRuntimeComputationSourceRegistry, getRuntimeComputationRegistryExecutor } from '../registry';
import type { RuntimeSourceDefinition, RuntimeSourceExecutor, RuntimeSourceToken, RuntimeRevision } from '../source';
import { createRuntimeSourceExecutor } from '../source';
import type { PerformanceTraceDiagnostic, RuntimeTraceReporter } from '../trace';
import { createRuntimeTraceReporter } from '../trace';
import type { RuntimeSourceCommandExecutor, RuntimeResult, RuntimeUpdate, RuntimeSnapshot } from '../transaction';
import {
  createNextRuntimeRevision,
  createRuntimeRevision,
  getRuntimeSourceCommandExecutor,
  isRuntimeRevision,
} from '../transaction';
import { RuntimeUpdateStrategy } from './constants';
import {
  createRuntimeParticipantError,
  createRuntimeParticipantLifecycleDiagnostic,
  createRuntimeParticipantInvocation,
  prepareRuntimeParticipant,
} from './participant';
import type { RuntimeSourceState, RuntimeComputationState, RuntimePreparedParticipantState } from './state';
import type { Runtime, RuntimeOptions } from './types';

type RuntimeComputationOutcome = Exclude<RuntimeComputationKind, typeof RuntimeComputationKind.Bailout>;

type RuntimeState =
  | 'preparing'
  | 'idle'
  | 'observing'
  | 'retiring'
  | 'broken'
  | 'disposing'
  | 'dispose-pending'
  | 'disposed';

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

/** 把 observer throw 转成不影响 publish 的结构化诊断 */
const observerDiagnostic = (definition: RuntimeComputationToken, cause: unknown): RuntimeDiagnostic =>
  Object.freeze({
    code: RuntimeDiagnosticCode.ComputationObserverFailed,
    phase: 'observe',
    severity: 'error',
    message: getRuntimeDiagnosticMessage(cause),
    owner: definition.id.owner,
    computation: definition.id,
    cause,
  });

/** 失败 transaction 可从 Runtime 内部保留的 execution diagnostic 闭集 */
const executionDiagnosticCodes = new Set<string>([
  ...Object.values(RuntimeTraceDiagnosticCodes),
  RuntimeDiagnosticCode.ResultDisposeFailed,
  RuntimeDiagnosticCode.SourceDisposeFailed,
]);

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
  const commands = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();

  for (const command of initialSnapshots) {
    const commandExecutor = getRuntimeSourceCommandExecutor(command);
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
    candidatePhase: 'candidate-read' | 'candidate-change' | 'candidate-result',
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
      throw withFailureDiagnostics(cause, Object.freeze([...cause.diagnostics, ...executionDiagnostics]));
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

/** 断言 Computation registry 与 Runtime 使用同一个 Source registry */
const assertRuntimeRegistryBinding = (
  sources: RuntimeSourceRegistry,
  computations: RuntimeOptions['computations'],
): void => {
  let computationSources: RuntimeSourceRegistry;

  try {
    computationSources = getRuntimeComputationSourceRegistry(computations);
  } catch (cause) {
    throw runtimeError(RetikzRuntimeErrorCode.RegistryMismatch, 'runtime-create', cause);
  }

  if (computationSources !== sources) {
    throw runtimeError(RetikzRuntimeErrorCode.RegistryMismatch, 'runtime-create', computations);
  }
};

/** 断言 participant 的依赖无重复且均属于当前注册表 */
const assertRuntimeParticipantDependencies = (
  participant: RuntimeCommitParticipantToken,
  sources: RuntimeSourceRegistry,
  computations: RuntimeOptions['computations'],
): void => {
  const sourceDependencies = new Set<RuntimeSourceToken>();

  for (const source of participant.sources) {
    if (sourceDependencies.has(source) || sources.find(source.key) !== source) {
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
      if (computations.find(computation.id) !== computation) {
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
};

/** 校验 participant 身份与依赖，并按 key 收集参与者及其执行器 */
const collectRuntimeParticipants = (
  participantsInput: NonNullable<RuntimeOptions['participants']>,
  sources: RuntimeSourceRegistry,
  computations: RuntimeOptions['computations'],
): Readonly<{
  /** 按 key 排序并冻结的参与者集合 */
  participants: ReadonlyArray<RuntimeCommitParticipantToken>;
  /** 与参与者对应的生命周期执行器 */
  participantExecutors: ReadonlyMap<RuntimeCommitParticipantToken, RuntimeCommitParticipantExecutor>;
}> => {
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
    assertRuntimeParticipantDependencies(participant, sources, computations);

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
  return { participants, participantExecutors };
};

/** 断言更新基于有效且仍为当前版本的 revision */
const assertRuntimeUpdateRevision = (baseRevision: RuntimeRevision, currentRevision: RuntimeRevision): void => {
  if (!isRuntimeRevision(baseRevision)) {
    throw runtimeError(RetikzRuntimeErrorCode.RevisionInvalid, 'update', baseRevision);
  }

  if (baseRevision !== currentRevision) {
    throw runtimeError(RetikzRuntimeErrorCode.RevisionStale, 'update', baseRevision);
  }
};

/** 校验更新命令的身份、Source 归属与唯一性，并收集对应执行器 */
const collectRuntimeSourceCommands = (
  sourceCommands: RuntimeUpdate['sources'],
  sources: RuntimeSourceRegistry,
): Map<RuntimeSourceToken, RuntimeSourceCommandExecutor> => {
  const commands = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();

  for (const command of sourceCommands) {
    const executor = getRuntimeSourceCommandExecutor(command);
    if (sources.find(command.source.key) !== command.source) {
      throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'update', command, command.source.key);
    }

    if (commands.has(command.source)) {
      throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'update', command, command.source.key);
    }

    commands.set(command.source, executor);
  }
  return commands;
};

/** 断言所有变更提示均基于本次更新的原版本 */
const assertRuntimeChangeSetRevisions = (
  commands: ReadonlyMap<RuntimeSourceToken, RuntimeSourceCommandExecutor>,
  baseRevision: RuntimeRevision,
): void => {
  for (const [source, executor] of commands) {
    if (executor.changeSetBaseRevision !== undefined && executor.changeSetBaseRevision !== baseRevision) {
      throw runtimeError(
        RetikzRuntimeErrorCode.ChangeSetRevisionMismatch,
        'change-set',
        executor.changeSetBaseRevision,
        source.key,
      );
    }
  }
};

/**
 * 创建同步 Snapshot transaction runtime
 * @param options 来源、计算、完整初始输入与可选参与者配置
 * @returns 已完成初始计算和参与者提交、revision 为 0 的同步 Runtime
 * @throws {RetikzRuntimeError} 注册绑定、初始输入或参与者无效，以及初始化执行或提交失败时抛出
 */
export const createRuntime = (options: RuntimeOptions): Runtime => {
  const { sources, computations, trace, initialSnapshots } = options;
  assertRuntimeRegistryBinding(sources, computations);

  const updateStrategy = options.updateStrategy ?? RuntimeUpdateStrategy.Auto;

  const { participants, participantExecutors } = collectRuntimeParticipants(
    options.participants ?? [],
    sources,
    computations,
  );

  const alreadyOwnedParticipant = claimRuntimeCommitParticipants(participants);
  if (alreadyOwnedParticipant !== undefined) {
    throw runtimeError(
      RetikzRuntimeErrorCode.ParticipantAlreadyOwned,
      'runtime-create',
      alreadyOwnedParticipant,
      alreadyOwnedParticipant.key,
    );
  }

  const sourceExecutor = createRuntimeSourceExecutor(sources);
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
    sourceStates = prepareInitialSources(sources, initialSnapshots, sourceExecutor);

    for (const definition of computations.definitions()) {
      const executor = getRuntimeComputationRegistryExecutor(computations, definition);
      const prepared = runComputation(
        RuntimeComputationPhase.Initial,
        undefined,
        currentRevision,
        sourceStates,
        new Set(sources.definitions()),
        new Map(),
        computationStates,
        definition,
        executor,
        trace,
        RuntimeComputationExecution.Full,
      );
      if (prepared.state === undefined) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.InternalInvariant,
          message: 'runtime: initial Computation returned no result',
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

      const invocation = createRuntimeParticipantInvocation(participant, trace);
      participantDrains.set(participant, invocation.takeDiagnostics);
      preparedParticipants.set(
        participant,
        prepareRuntimeParticipant(participant, executor, {
          invocation,
          phase: RuntimeComputationPhase.Initial,
          baseRevision: undefined,
          candidateRevision: currentRevision,
          sourceStates,
          computationStates,
          diagnostics: initialParticipantDiagnostics,
        }),
      );
    }

    for (const participant of participants) {
      try {
        preparedParticipants.get(participant)?.prepared.commit();
      } catch (cause) {
        initialParticipantDiagnostics.push(...(preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
        throw createRuntimeParticipantError(
          RetikzRuntimeErrorCode.ParticipantCommitFailed,
          'commit',
          participant,
          cause,
        );
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
          throw createRuntimeParticipantError(RetikzRuntimeErrorCode.ParticipantReadFailed, 'read', participant, cause);
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
            createRuntimeParticipantLifecycleDiagnostic(
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
            createRuntimeParticipantLifecycleDiagnostic(
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
          createRuntimeParticipantLifecycleDiagnostic(
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

    for (const definition of [...computations.definitions()].reverse()) {
      const prepared = computationStates.get(definition);
      if (prepared !== undefined) failedDiagnostics.push(...prepared.executor.retire(prepared.prepared));
    }

    for (const source of [...sources.definitions()].reverse()) {
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
        assertRuntimeUpdateRevision(update.baseRevision, currentRevision);

        if (update.sources.length === 0) {
          return Object.freeze({
            revision: currentRevision,
            outcome: RuntimeComputationKind.Bailout,
            diagnostics: Object.freeze([]),
          });
        }

        const commands = collectRuntimeSourceCommands(update.sources, sources);
        assertRuntimeChangeSetRevisions(commands, update.baseRevision);

        const candidateRevision = createNextRuntimeRevision(currentRevision);

        const nextSourceStates = new Map(sourceStates);
        const changedSources = new Set<RuntimeSourceToken>();
        const changeSets = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();
        const candidateDiagnostics: Array<RuntimeDiagnostic> = [];
        const preparedSourceCandidates = new Map<RuntimeSourceToken, RuntimeSourceState>();

        try {
          for (const source of sources.definitions()) {
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

            if (command.changeSetBaseRevision !== undefined) changeSets.set(source, command);

            nextSourceStates.set(source, candidateState);
            changedSources.add(source);
          }
        } catch (cause) {
          const failedDiagnostics = [...candidateDiagnostics.filter(isExecutionDiagnostic), ...errorDiagnostics(cause)];

          for (const source of [...sources.definitions()].reverse()) {
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
          for (const definition of computations.definitions()) {
            const executor = getRuntimeComputationRegistryExecutor(computations, definition);
            const directSourceChange = executor.sources.some(source => changedSources.has(source));
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
              trace,
              upstreamFallback
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

            const invocation = createRuntimeParticipantInvocation(participant, trace);
            participantDrains.set(participant, invocation.takeDiagnostics);
            preparedUpdateParticipants.set(
              participant,
              prepareRuntimeParticipant(participant, executor, {
                invocation,
                phase: RuntimeComputationPhase.Update,
                baseRevision: currentRevision,
                candidateRevision,
                sourceStates: nextSourceStates,
                computationStates: nextComputationStates,
                diagnostics: candidateParticipantDiagnostics,
              }),
            );
          }

          for (const participant of selectedParticipants) {
            try {
              preparedUpdateParticipants.get(participant)?.prepared.commit();
            } catch (cause) {
              candidateParticipantDiagnostics.push(
                ...(preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
              );
              throw createRuntimeParticipantError(
                RetikzRuntimeErrorCode.ParticipantCommitFailed,
                'commit',
                participant,
                cause,
              );
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
                throw createRuntimeParticipantError(
                  RetikzRuntimeErrorCode.ParticipantReadFailed,
                  'read',
                  participant,
                  cause,
                );
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
                  createRuntimeParticipantLifecycleDiagnostic(
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
                createRuntimeParticipantLifecycleDiagnostic(
                  RetikzRuntimeErrorCode.ParticipantTokenDisposeFailed,
                  'token-dispose',
                  participant,
                  disposeCause,
                ),
              );
            }
          }

          for (const definition of [...computations.definitions()].reverse()) {
            const candidate = nextComputationStates.get(definition);
            const previous = computationStates.get(definition);
            if (candidate !== undefined && candidate !== previous) {
              failedDiagnostics.push(...candidate.executor.retire(candidate.prepared));
            }
          }

          for (const source of [...sources.definitions()].reverse()) {
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

        for (const definition of computations.definitions()) {
          const outcome = computationOutcomes.get(definition);
          if (outcome === undefined) continue;

          const computationState = computationStates.get(definition);
          if (computationState === undefined || computationState.executor.observeCommit === undefined) continue;

          const event: RuntimeCommitEvent<unknown> = Object.freeze({
            phase: RuntimeComputationPhase.Update,
            baseRevision,
            revision: currentRevision,
            outcome,
            result: computationState.executor.snapshotToken(definition, computationState.prepared, currentRevision),
            diagnostics: frozenDiagnostics,
          });

          try {
            computationState.executor.observeCommit<unknown>(event);
          } catch (cause) {
            candidateDiagnostics.push(observerDiagnostic(definition, cause));
          }
        }

        state = 'retiring';

        for (const definition of [...computations.definitions()].reverse()) {
          if (!computationOutcomes.has(definition)) continue;
          const previous = previousComputationStates.get(definition);
          if (previous !== undefined) candidateDiagnostics.push(...previous.executor.retire(previous.prepared));
        }

        for (const source of [...sources.definitions()].reverse()) {
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
              createRuntimeParticipantLifecycleDiagnostic(
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
      sources.resolve(source);
      const sourceState = sourceStates.get(source);
      if (sourceState === undefined)
        throw runtimeError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'snapshot', source, source.key);

      return sourceState.command.snapshot(source, sourceState.prepared, currentRevision);
    },
    result: <TResultInput, TResult, TComputationRead, TPublicRead>(
      computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
    ): RuntimeSnapshot<TPublicRead> => {
      assertIdle('result');
      computations.resolve(computation);
      const computationState = computationStates.get(computation);
      if (computationState === undefined)
        throw runtimeError(RetikzRuntimeErrorCode.UndeclaredDependency, 'result', computation);

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
              createRuntimeParticipantLifecycleDiagnostic(
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

        for (const definition of [...computations.definitions()].reverse()) {
          const computationState = computationStates.get(definition);
          if (computationState !== undefined)
            diagnosticQueue.push(...computationState.executor.retire(computationState.prepared));
        }

        for (const source of [...sources.definitions()].reverse()) {
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

  for (const definition of computations.definitions()) {
    const computationState = computationStates.get(definition);
    if (computationState === undefined || computationState.executor.observeCommit === undefined) continue;

    const event: RuntimeCommitEvent<unknown> = Object.freeze({
      phase: RuntimeComputationPhase.Initial,
      revision: currentRevision,
      outcome: RuntimeComputationKind.Full,
      result: computationState.executor.snapshotToken(definition, computationState.prepared, currentRevision),
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
        createRuntimeParticipantLifecycleDiagnostic(
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
