import type { RuntimeComputationDefinition, RuntimeComputationToken } from '../computation';
import { RuntimeComputationPhase } from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import { RuntimeDiagnosticCode } from '../diagnostic';
import { RuntimeTraceDiagnosticCodes, getRuntimeDiagnosticMessage } from '../diagnostic/internal';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type {
  RuntimeCommitParticipantToken,
  RuntimeParticipantCandidateView,
  RuntimeParticipantContext,
} from '../participant';
import type { RuntimeCommitParticipantExecutor } from '../participant/internal';
import {
  claimRuntimeCommitParticipants,
  consumeRuntimeCommitParticipant,
  getRuntimeCommitParticipantExecutor,
  isRuntimeCommitParticipant,
} from '../participant/internal';
import type { RuntimeSourceRegistry } from '../registry';
import type { RuntimeSourceDefinition, RuntimeSourceToken } from '../source';
import type { PerformanceTraceDiagnostic } from '../trace';
import { createRuntimeTraceReporter } from '../trace';
import { observeRuntimeTraceReporterDiagnostics } from '../trace/internal';
import type { RuntimeSnapshot } from '../transaction';
import { createRuntimeContractError } from './error';
import type {
  RuntimeComputationOutcome,
  RuntimeParticipantCandidateContext,
  RuntimeParticipantRollbackFailure,
  RuntimeParticipantTransactionContext,
  RuntimePreparedParticipantState,
} from './state';
import type { RuntimeOptions } from './types';

/** 创建当前 participant candidate 读取产生的依赖错误 */
const createParticipantDependencyError = (
  code: typeof RetikzRuntimeErrorCode.UndeclaredDependency,
  phase: string,
  cause: unknown,
  owner: string,
): RetikzRuntimeError => Object.freeze(new RetikzRuntimeError({ code, phase, cause, owner }));

/** 把 participant callback throw 转成稳定 lifecycle error */
const createRuntimeParticipantError = (
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
const createRuntimeParticipantLifecycleDiagnostic = (
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
const createRuntimeParticipantInvocation = (
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

/** 管理独占 Participant 的调用与释放；不持有 Runtime 当前版本或已发布读值 */
export class RuntimeParticipantManager {
  /** 按 key 排序的独占宿主 */
  private readonly participants: ReadonlyArray<RuntimeCommitParticipantToken>;

  /** 宿主生命周期执行器 */
  private readonly participantExecutors: ReadonlyMap<RuntimeCommitParticipantToken, RuntimeCommitParticipantExecutor>;

  /** 最近一次调用的诊断提取入口，释放宿主时继续使用 */
  private readonly participantDrains = new Map<RuntimeCommitParticipantToken, () => ReadonlyArray<RuntimeDiagnostic>>();

  /** 尚未成功释放的宿主 */
  private readonly pendingParticipantDisposals: Set<RuntimeCommitParticipantToken>;

  /** 可选执行观测入口 */
  private readonly trace: RuntimeOptions['trace'];

  /** 完成身份和依赖预检后，一次性独占全部参与者 */
  constructor(
    participantsInput: NonNullable<RuntimeOptions['participants']>,
    sources: RuntimeOptions['sources'],
    computations: RuntimeOptions['computations'],
    trace: RuntimeOptions['trace'],
  ) {
    const { participants, participantExecutors } = collectRuntimeParticipants(participantsInput, sources, computations);
    const alreadyOwnedParticipant = claimRuntimeCommitParticipants(participants);
    if (alreadyOwnedParticipant !== undefined)
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ParticipantAlreadyOwned,
        'runtime-create',
        alreadyOwnedParticipant,
        alreadyOwnedParticipant.key,
      );
    this.participants = participants;
    this.participantExecutors = participantExecutors;
    this.pendingParticipantDisposals = new Set(participants);
    this.trace = trace;
  }

  /** 校验公开读取的 token 身份与实例归属，生命周期门禁仍由 Runtime 执行 */
  assertParticipant(participant: RuntimeCommitParticipantToken): void {
    const participantCandidate: unknown = participant;

    if (!isRuntimeCommitParticipant(participantCandidate)) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ParticipantTokenInvalid,
        'participant',
        participantCandidate,
      );
    }

    if (!this.participantExecutors.has(participant)) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ParticipantUnknown,
        'participant',
        participant,
        participant.key,
      );
    }
  }

  /** 初始化时准备全部参与者，失败时保留已准备 token 供 Runtime 安排回滚 */
  prepareInitial(
    transaction: RuntimeParticipantTransactionContext,
    candidate: RuntimeParticipantCandidateContext,
  ): void {
    for (const participant of this.participants) this.prepareParticipant(participant, transaction, candidate);
  }

  /** continuous 跟随每次有效更新，其余参与者仅在声明依赖受影响时准备 */
  prepareUpdate(
    transaction: RuntimeParticipantTransactionContext,
    candidate: RuntimeParticipantCandidateContext,
    changedSources: ReadonlySet<RuntimeSourceToken>,
    computationOutcomes: ReadonlyMap<RuntimeComputationToken, RuntimeComputationOutcome>,
  ): void {
    for (const participant of this.participants) {
      const isAffected =
        participant.sources.some(source => changedSources.has(source)) ||
        participant.computations.some(computation => computationOutcomes.has(computation));
      if (participant.revisionPolicy !== 'continuous' && !isAffected) continue;
      this.prepareParticipant(participant, transaction, candidate);
    }
  }

  /** 为一个选中宿主建立依赖受限的候选视图，并捕获事务 token 与诊断 */
  private prepareParticipant(
    participant: RuntimeCommitParticipantToken,
    transaction: RuntimeParticipantTransactionContext,
    candidate: RuntimeParticipantCandidateContext,
  ): void {
    transaction.selectedParticipants.push(participant);
    const executor = this.participantExecutors.get(participant);
    if (executor === undefined)
      throw new RetikzRuntimeError({
        code: RetikzRuntimeErrorCode.InternalInvariant,
        message: 'runtime: missing participant executor',
        phase: candidate.phase === RuntimeComputationPhase.Initial ? 'participant-prepare' : 'participant-commit',
        cause: participant,
      });

    const invocation = createRuntimeParticipantInvocation(participant, this.trace);
    this.participantDrains.set(participant, invocation.takeDiagnostics);
    const { phase, baseRevision, candidateRevision, sourceStates, computationStates } = candidate;
    const diagnostics = transaction.diagnostics;
    let participantState: RuntimePreparedParticipantState;

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

    const candidateView: RuntimeParticipantCandidateView =
      phase === RuntimeComputationPhase.Initial
        ? Object.freeze({ ...lookup, phase, candidateRevision })
        : Object.freeze({ ...lookup, phase, candidateRevision, baseRevision: baseRevision ?? candidateRevision });

    try {
      const prepared = executor.prepare(candidateView, invocation.context);
      participantState = Object.freeze({ prepared, takeDiagnostics: invocation.takeDiagnostics });
    } catch (cause) {
      if (cause instanceof RetikzRuntimeError && invocationErrors.has(cause)) throw cause;
      throw createRuntimeParticipantError(
        RetikzRuntimeErrorCode.ParticipantPrepareFailed,
        'prepare',
        participant,
        cause,
      );
    } finally {
      diagnostics.push(...invocation.takeDiagnostics());
    }
    transaction.preparedParticipants.set(participant, participantState);
  }

  /** 正序提交已准备的宿主，失败交由 Runtime 组织整批回滚 */
  commit(transaction: RuntimeParticipantTransactionContext): void {
    for (const participant of transaction.selectedParticipants) {
      try {
        transaction.preparedParticipants.get(participant)?.prepared.commit();
      } catch (cause) {
        throw createRuntimeParticipantError(
          RetikzRuntimeErrorCode.ParticipantCommitFailed,
          'commit',
          participant,
          cause,
        );
      } finally {
        transaction.diagnostics.push(...(transaction.preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
      }
    }
  }

  /** 读取提交后的宿主视图并填入候选表，保留未参与项，不发布当前状态 */
  readCandidates(
    transaction: RuntimeParticipantTransactionContext,
    candidateReads: Map<RuntimeCommitParticipantToken, unknown>,
  ): void {
    for (const participant of transaction.selectedParticipants) {
      const executor = this.participantExecutors.get(participant);
      if (executor === undefined) continue;

      try {
        candidateReads.set(participant, executor.read());
      } catch (cause) {
        throw createRuntimeParticipantError(RetikzRuntimeErrorCode.ParticipantReadFailed, 'read', participant, cause);
      } finally {
        transaction.diagnostics.push(...(transaction.preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
      }
    }
  }

  /**
   * 逆序回滚已准备的 token，并保留回调诊断的发生顺序
   * 初始化失败时所有回滚异常作为次级诊断；更新失败时返回首个异常供 Runtime 进入 broken
   */
  rollback(
    transaction: RuntimeParticipantTransactionContext,
    diagnostics: Array<RuntimeDiagnostic>,
    phase: RuntimeComputationPhase,
  ): RuntimeParticipantRollbackFailure | undefined {
    let firstRollbackFailure: RuntimeParticipantRollbackFailure | undefined;
    for (const participant of [...transaction.selectedParticipants].reverse()) {
      const participantState = transaction.preparedParticipants.get(participant);
      if (participantState === undefined) continue;
      try {
        participantState.prepared.rollback();
        diagnostics.push(...participantState.takeDiagnostics());
      } catch (cause) {
        diagnostics.push(...participantState.takeDiagnostics());
        if (phase === RuntimeComputationPhase.Update && firstRollbackFailure === undefined) {
          firstRollbackFailure = Object.freeze({ participant, cause });
          continue;
        }
        diagnostics.push(
          createRuntimeParticipantLifecycleDiagnostic(
            RetikzRuntimeErrorCode.ParticipantRollbackFailed,
            'rollback',
            participant,
            cause,
          ),
        );
      }
    }
    return firstRollbackFailure;
  }

  /** 逆序释放本轮事务 token；调用方必须先完成整批提交或回滚 */
  disposeTokens(transaction: RuntimeParticipantTransactionContext, diagnostics: Array<RuntimeDiagnostic>): void {
    for (const participant of [...transaction.selectedParticipants].reverse()) {
      const participantState = transaction.preparedParticipants.get(participant);
      if (participantState === undefined) continue;

      try {
        participantState.prepared.dispose();
        diagnostics.push(...participantState.takeDiagnostics());
      } catch (disposeCause) {
        diagnostics.push(...participantState.takeDiagnostics());
        diagnostics.push(
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

  /** 初始化失败后销毁全部宿主，无论销毁成功与否都永久消费 token */
  disposeFailedInitial(diagnostics: Array<RuntimeDiagnostic>): void {
    for (const participant of [...this.participants].reverse()) {
      this.disposeParticipant(participant, diagnostics);
      consumeRuntimeCommitParticipant(participant);
    }
  }

  /** 逆序重试尚未成功释放的宿主，仅消费成功项 */
  disposePending(diagnostics: Array<RuntimeDiagnostic>): void {
    for (const participant of [...this.participants].reverse()) {
      if (!this.pendingParticipantDisposals.has(participant)) continue;
      if (!this.disposeParticipant(participant, diagnostics)) continue;
      this.pendingParticipantDisposals.delete(participant);
      consumeRuntimeCommitParticipant(participant);
    }
  }

  /** 释放单个宿主并按调用顺序收集诊断，返回是否成功；token 消费策略由调用方决定 */
  private disposeParticipant(
    participant: RuntimeCommitParticipantToken,
    diagnostics: Array<RuntimeDiagnostic>,
  ): boolean {
    let failure: Readonly<{ cause: unknown }> | undefined;
    try {
      this.participantExecutors.get(participant)?.dispose();
    } catch (cause) {
      failure = { cause };
    }
    diagnostics.push(...(this.participantDrains.get(participant)?.() ?? []));
    if (failure === undefined) return true;
    diagnostics.push(
      createRuntimeParticipantLifecycleDiagnostic(
        RetikzRuntimeErrorCode.ParticipantDisposeFailed,
        'participant-dispose',
        participant,
        failure.cause,
      ),
    );
    return false;
  }

  /** 判断是否仍有宿主需要在 Runtime 后续 dispose 调用中重试 */
  hasPendingDisposals(): boolean {
    return this.pendingParticipantDisposals.size > 0;
  }
}
