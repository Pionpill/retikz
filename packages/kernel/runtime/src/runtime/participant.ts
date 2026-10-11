import type { RuntimeComputationDefinition, RuntimeComputationToken } from '../computation';
import { RuntimeComputationPhase } from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import { RuntimeDiagnosticCode } from '../diagnostic';
import { getRuntimeDiagnosticMessage, RuntimeTraceDiagnosticCodes } from '../diagnostic/internal';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type {
  RuntimeCommitParticipantToken,
  RuntimeParticipantCandidateView,
  RuntimeParticipantContext,
} from '../participant';
import type { RuntimeCommitParticipantExecutor } from '../participant/internal';
import { getRuntimeCommitParticipantExecutor, isRuntimeCommitParticipant } from '../participant/internal';
import type { RuntimeSourceRegistry } from '../registry';
import type { RuntimeRevision, RuntimeSourceDefinition, RuntimeSourceToken } from '../source';
import type { PerformanceTraceDiagnostic } from '../trace';
import { createRuntimeTraceReporter } from '../trace';
import { observeRuntimeTraceReporterDiagnostics } from '../trace/internal';
import type { RuntimeSnapshot } from '../transaction';
import { createRuntimeContractError } from './error';
import type { RuntimeComputationState, RuntimePreparedParticipantState, RuntimeSourceState } from './state';
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

/** 本轮 participant 准备所需的候选状态、调用入口与诊断收集器 */
type RuntimeParticipantPreparationContext = Readonly<{
  /** 本轮 trace 与 warning 调用上下文及诊断读取入口 */
  invocation: ReturnType<typeof createRuntimeParticipantInvocation>;
  /** 初始化或更新阶段 */
  phase: RuntimeComputationPhase;
  /** 更新基于的已提交版本，初始化时不存在 */
  baseRevision: RuntimeRevision | undefined;
  /** 候选状态完整发布后使用的版本 */
  candidateRevision: RuntimeRevision;
  /** 本轮候选 Source 状态 */
  sourceStates: ReadonlyMap<RuntimeSourceToken, RuntimeSourceState>;
  /** 本轮候选 Computation 状态 */
  computationStates: ReadonlyMap<RuntimeComputationToken, RuntimeComputationState>;
  /** 接收准备期间产生的诊断 */
  diagnostics: Array<RuntimeDiagnostic>;
}>;

/** 为 initial / update 的固定候选状态准备一次 participant 提交 */
export const prepareRuntimeParticipant = (
  participant: RuntimeCommitParticipantToken,
  executor: RuntimeCommitParticipantExecutor,
  context: RuntimeParticipantPreparationContext,
): RuntimePreparedParticipantState => {
  const { invocation, phase, baseRevision, candidateRevision, sourceStates, computationStates, diagnostics } = context;
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

/** 断言 participant 的依赖无重复且均属于当前注册表 */
const assertRuntimeParticipantDependencies = (
  participant: RuntimeCommitParticipantToken,
  sources: RuntimeSourceRegistry,
  computations: RuntimeOptions['computations'],
): void => {
  const sourceDependencies = new Set<RuntimeSourceToken>();

  for (const source of participant.sources) {
    if (sourceDependencies.has(source) || sources.find(source.key) !== source) {
      throw createRuntimeContractError(
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
      throw createRuntimeContractError(
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
      throw createRuntimeContractError(
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
export const collectRuntimeParticipants = (
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
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ParticipantTokenInvalid,
        'runtime-create',
        participantCandidate,
      );
    }

    const participant = participantCandidate;
    if (participantKeys.has(participant.key)) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ParticipantDuplicate,
        'runtime-create',
        participant,
        participant.key,
      );
    }

    participantKeys.add(participant.key);
    assertRuntimeParticipantDependencies(participant, sources, computations);

    const executor = getRuntimeCommitParticipantExecutor(participant);
    if (executor === undefined) {
      throw createRuntimeContractError(
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
