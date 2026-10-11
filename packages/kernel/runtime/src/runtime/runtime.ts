import type { RuntimeCommitEvent, RuntimeComputationDefinition, RuntimeComputationToken } from '../computation';
import { RuntimeComputationExecution, RuntimeComputationKind, RuntimeComputationPhase } from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeCommitParticipant, RuntimeCommitParticipantToken } from '../participant';
import type { RuntimeCommitParticipantExecutor } from '../participant/internal';
import {
  claimRuntimeCommitParticipants,
  consumeRuntimeCommitParticipant,
  isRuntimeCommitParticipant,
} from '../participant/internal';
import type { RuntimeSourceRegistry } from '../registry';
import { getRuntimeComputationRegistryExecutor, getRuntimeComputationSourceRegistry } from '../registry';
import type { RuntimeRevision, RuntimeSourceDefinition, RuntimeSourceExecutor, RuntimeSourceToken } from '../source';
import { createRuntimeSourceExecutor } from '../source';
import type { RuntimeResult, RuntimeSnapshot, RuntimeSourceCommandExecutor, RuntimeUpdate } from '../transaction';
import { createNextRuntimeRevision, createRuntimeRevision, isRuntimeRevision } from '../transaction';
import { createRuntimeObserverDiagnostic, runRuntimeComputation } from './computation';
import { RuntimeUpdateStrategy } from './constants';
import { createRuntimeContractError, isRuntimeExecutionDiagnostic, withRuntimeFailureDiagnostics } from './error';
import {
  collectRuntimeParticipants,
  createRuntimeParticipantError,
  createRuntimeParticipantInvocation,
  createRuntimeParticipantLifecycleDiagnostic,
  prepareRuntimeParticipant,
} from './participant';
import {
  assertRuntimeChangeSetRevisions,
  collectRuntimeSourceCommands,
  mapRuntimeSourceLifecycleDiagnostic,
  prepareRuntimeInitialSources,
  prepareRuntimeSourceCandidates,
} from './source';
import type {
  RuntimeComputationOutcome,
  RuntimeComputationState,
  RuntimeInitialContext,
  RuntimePreparedParticipantState,
  RuntimeSourceState,
  RuntimeState,
  RuntimeUpdateContext,
} from './state';
import type { Runtime, RuntimeOptions } from './types';

/** 断言 Computation registry 与 Runtime 使用同一个 Source registry */
const assertRuntimeRegistryBinding = (
  sources: RuntimeSourceRegistry,
  computations: RuntimeOptions['computations'],
): void => {
  let computationSources: RuntimeSourceRegistry;

  try {
    computationSources = getRuntimeComputationSourceRegistry(computations);
  } catch (cause) {
    throw createRuntimeContractError(RetikzRuntimeErrorCode.RegistryMismatch, 'runtime-create', cause);
  }

  if (computationSources !== sources) {
    throw createRuntimeContractError(RetikzRuntimeErrorCode.RegistryMismatch, 'runtime-create', computations);
  }
};

/** 断言更新基于有效且仍为当前版本的 revision */
const assertRuntimeUpdateRevision = (baseRevision: RuntimeRevision, currentRevision: RuntimeRevision): void => {
  if (!isRuntimeRevision(baseRevision)) {
    throw createRuntimeContractError(RetikzRuntimeErrorCode.RevisionInvalid, 'update', baseRevision);
  }

  if (baseRevision !== currentRevision) {
    throw createRuntimeContractError(RetikzRuntimeErrorCode.RevisionStale, 'update', baseRevision);
  }
};

/** 持有已提交状态并编排同步事务，单次候选仅保存在方法局部 */
class RuntimeManager {
  /** Source 注册表 */
  private readonly sources: RuntimeOptions['sources'];

  /** Computation 拓扑注册表 */
  private readonly computations: RuntimeOptions['computations'];

  /** 可选执行观测入口 */
  private readonly trace: RuntimeOptions['trace'];

  /** 计算更新策略 */
  private readonly updateStrategy: RuntimeUpdateStrategy;

  /** 按 key 排序的独占参与者 */
  private readonly participants: ReadonlyArray<RuntimeCommitParticipantToken>;

  /** 参与者生命周期执行器 */
  private readonly participantExecutors: ReadonlyMap<RuntimeCommitParticipantToken, RuntimeCommitParticipantExecutor>;

  /** Source 捕获、比较和释放入口 */
  private readonly sourceExecutor: RuntimeSourceExecutor;

  /** 初始化期间承载首批状态；更新期间只在提交成功后整体替换，供公开读取使用 */
  private sourceStates = new Map<RuntimeSourceToken, RuntimeSourceState>();

  /** 当前计算结果及其资源所有权，未受影响的计算在更新时复用原状态 */
  private computationStates = new Map<RuntimeComputationToken, RuntimeComputationState>();

  /** 仅成功发布后推进的当前版本 */
  private currentRevision = createRuntimeRevision(0);

  /** 生命周期门禁，阻止用户回调在准备、通知或释放过程中重入读写 */
  private state: RuntimeState = 'preparing';

  /** 保留首次回滚失败的原因，后续读写统一报告 Runtime 已失去可恢复的事务状态 */
  private brokenError: RetikzRuntimeError | undefined;

  /** 累积尚未由 diagnostics() 取走的执行、观察和清理诊断 */
  private diagnosticQueue: Array<RuntimeDiagnostic> = [];

  /** 保留每个宿主最近一次调用的诊断提取入口，供最终释放阶段使用 */
  private readonly participantDrains = new Map<RuntimeCommitParticipantToken, () => ReadonlyArray<RuntimeDiagnostic>>();

  /** 成功提交后缓存的宿主读值，公开读取不再次调用 Participant 的 read 回调 */
  private participantReads = new Map<RuntimeCommitParticipantToken, unknown>();

  /** 尚未成功释放的宿主，释放失败后保留以便重试 */
  private readonly pendingParticipantDisposals: Set<RuntimeCommitParticipantToken>;

  /** 确保重试 Participant 释放时不会重复退役 Source 和 Computation 资源 */
  private hasRetiredResources = false;

  /** 接管参与者并完成初始事务，不暴露半初始化实例 */
  constructor(options: RuntimeOptions) {
    const { sources, computations, trace, initialSnapshots } = options;
    assertRuntimeRegistryBinding(sources, computations);

    const updateStrategy = options.updateStrategy ?? RuntimeUpdateStrategy.Auto;

    const { participants, participantExecutors } = collectRuntimeParticipants(
      options.participants ?? [],
      sources,
      computations,
    );

    /** 在执行用户生命周期前独占 Participant token，避免同一宿主资源被多个 Runtime 接管 */
    const alreadyOwnedParticipant = claimRuntimeCommitParticipants(participants);
    if (alreadyOwnedParticipant !== undefined) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ParticipantAlreadyOwned,
        'runtime-create',
        alreadyOwnedParticipant,
        alreadyOwnedParticipant.key,
      );
    }
    this.sources = sources;
    this.computations = computations;
    this.trace = trace;
    this.updateStrategy = updateStrategy;
    this.participants = participants;
    this.participantExecutors = participantExecutors;
    this.sourceExecutor = createRuntimeSourceExecutor(sources);
    this.pendingParticipantDisposals = new Set(participants);
    this.initialize(initialSnapshots);
  }

  /** 初始化完成后才允许公开接口读写；失败时清理已接管资源 */
  private initialize(initialSnapshots: RuntimeOptions['initialSnapshots']): void {
    const context: RuntimeInitialContext = {
      initialDiagnostics: [],
      initialParticipantDiagnostics: [],
      preparedParticipants: new Map(),
    };
    try {
      this.sourceStates = prepareRuntimeInitialSources(this.sources, initialSnapshots, this.sourceExecutor);
      this.prepareInitialComputations(context);
      this.prepareInitialParticipants(context);
      this.commitInitialParticipants(context);
      this.readInitialParticipants(context);
    } catch (cause) {
      this.rollbackInitial(context, cause);
    }
    this.notifyInitial(context);
  }

  /** 按生命周期拒绝失效或重入读写 */
  private assertIdle(phase: string): void {
    if (this.state === 'dispose-pending' || this.state === 'disposed') {
      throw createRuntimeContractError(RetikzRuntimeErrorCode.Disposed, phase, undefined);
    }

    if (this.state === 'broken') {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ParticipantRollbackFailed,
        phase,
        this.brokenError,
        this.brokenError?.owner,
      );
    }

    if (this.state !== 'idle') throw createRuntimeContractError(RetikzRuntimeErrorCode.Reentrant, phase, this.state);
  }

  /** 读取当前已发布版本 */
  readonly revision: Runtime['revision'] = () => this.currentRevision;

  /**
   * 基于当前 revision 同步准备并发布一次更新
   * @description Source 比较决定实际变更，Computation 按依赖传播执行结果，Participant 随后提交
   * 无实际 Source 变更时不推进 revision；发布前失败保留当前状态，回滚失败则进入 broken
   */
  readonly update: Runtime['update'] = (update: RuntimeUpdate): RuntimeResult => {
    this.assertIdle('update');
    this.state = 'preparing';
    try {
      assertRuntimeUpdateRevision(update.baseRevision, this.currentRevision);

      if (update.sources.length === 0) {
        return Object.freeze({
          revision: this.currentRevision,
          outcome: RuntimeComputationKind.Bailout,
          diagnostics: Object.freeze([]),
        });
      }

      const commands = collectRuntimeSourceCommands(update.sources, this.sources);
      assertRuntimeChangeSetRevisions(commands, update.baseRevision);
      const context: RuntimeUpdateContext = {
        candidateRevision: createNextRuntimeRevision(this.currentRevision),
        nextSourceStates: new Map(this.sourceStates),
        changedSources: new Set<RuntimeSourceToken>(),
        changeSets: new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>(),
        candidateDiagnostics: [],
        nextComputationStates: new Map(this.computationStates),
        computationOutcomes: new Map<RuntimeComputationToken, RuntimeComputationOutcome>(),
        candidateParticipantDiagnostics: [],
        selectedParticipants: [],
        preparedUpdateParticipants: new Map<RuntimeCommitParticipantToken, RuntimePreparedParticipantState>(),
        nextParticipantReads: new Map(this.participantReads),
      };
      try {
        prepareRuntimeSourceCandidates(this.sources, this.sourceExecutor, this.sourceStates, commands, context);
      } catch (cause) {
        this.diagnosticQueue.push(...context.candidateDiagnostics);
        throw cause;
      }

      /** 相等候选已释放；整批无变化时跳过计算和 Participant，保持原 revision */
      if (context.changedSources.size === 0) {
        const bailoutDiagnostics = Object.freeze([...context.candidateDiagnostics]);
        this.diagnosticQueue.push(...bailoutDiagnostics);

        return Object.freeze({
          revision: this.currentRevision,
          outcome: RuntimeComputationKind.Bailout,
          diagnostics: bailoutDiagnostics,
        });
      }
      try {
        this.prepareUpdateComputations(context);
        this.prepareUpdateParticipants(context);
        this.commitUpdateParticipants(context);
        this.readUpdateParticipants(context);
      } catch (cause) {
        this.rollbackUpdate(context, cause);
      }
      return this.publishUpdate(context);
    } finally {
      if (this.brokenError === undefined) this.state = 'idle';
    }
  };

  /** 读取当前 Source 快照 */
  readonly snapshot: Runtime['snapshot'] = <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => {
    this.assertIdle('snapshot');
    this.sources.resolve(source);
    const sourceState = this.sourceStates.get(source);
    if (sourceState === undefined)
      throw createRuntimeContractError(RetikzRuntimeErrorCode.SourceCommandInvalid, 'snapshot', source, source.key);

    return sourceState.command.snapshot(source, sourceState.prepared, this.currentRevision);
  };

  /** 读取当前 Computation 公开结果 */
  readonly result: Runtime['result'] = <TResultInput, TResult, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
  ): RuntimeSnapshot<TPublicRead> => {
    this.assertIdle('result');
    this.computations.resolve(computation);
    const computationState = this.computationStates.get(computation);
    if (computationState === undefined)
      throw createRuntimeContractError(RetikzRuntimeErrorCode.UndeclaredDependency, 'result', computation);

    return computationState.executor.snapshot(computation, computationState.prepared, this.currentRevision);
  };

  /** 读取已提交的 Participant 宿主视图 */
  readonly participant: Runtime['participant'] = <TRead>(participant: RuntimeCommitParticipant<TRead>): TRead => {
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

    this.assertIdle('participant');

    return this.participantReads.get(participant) as TRead;
  };

  /** 排空诊断队列；broken 或释放后仍允许读取，但生命周期回调中禁止重入 */
  readonly diagnostics: Runtime['diagnostics'] = () => {
    if (
      this.state !== 'idle' &&
      this.state !== 'broken' &&
      this.state !== 'dispose-pending' &&
      this.state !== 'disposed'
    ) {
      throw createRuntimeContractError(RetikzRuntimeErrorCode.Reentrant, 'diagnostics', this.state);
    }

    const output = Object.freeze([...this.diagnosticQueue]);
    this.diagnosticQueue = [];

    return output;
  };

  /**
   * 释放 Runtime 持有的宿主和结果资源，已完成释放时幂等返回
   * @description Participant 先尝试释放，Source / Computation 只退役一次，随后立即重试失败的宿主
   * 仍有失败项时进入 dispose-pending，后续调用仅重试这些 Participant，期间禁止正常读写
   */
  readonly dispose: Runtime['dispose'] = () => {
    if (this.state === 'disposed') return;
    if (this.state !== 'broken' && this.state !== 'dispose-pending') this.assertIdle('dispose');
    this.state = 'disposing';

    this.disposePendingParticipants();
    if (!this.hasRetiredResources) {
      this.participantReads.clear();

      for (const definition of [...this.computations.definitions()].reverse()) {
        const computationState = this.computationStates.get(definition);
        if (computationState === undefined) continue;

        this.diagnosticQueue.push(...computationState.executor.retire(computationState.prepared));
      }

      for (const source of [...this.sources.definitions()].reverse()) {
        const sourceState = this.sourceStates.get(source);
        if (sourceState === undefined) continue;

        this.diagnosticQueue.push(
          ...sourceState.command
            .retire(this.sourceExecutor, sourceState.prepared)
            .diagnostics.map(mapRuntimeSourceLifecycleDiagnostic),
        );
      }

      this.hasRetiredResources = true;
      if (this.pendingParticipantDisposals.size > 0) this.disposePendingParticipants();
    }

    this.state = this.pendingParticipantDisposals.size > 0 ? 'dispose-pending' : 'disposed';
  };

  /** 按拓扑顺序准备所有初始计算结果 */
  private prepareInitialComputations(context: RuntimeInitialContext): void {
    for (const definition of this.computations.definitions()) {
      const executor = getRuntimeComputationRegistryExecutor(this.computations, definition);
      const prepared = runRuntimeComputation(
        RuntimeComputationPhase.Initial,
        undefined,
        this.currentRevision,
        this.sourceStates,
        new Set(this.sources.definitions()),
        new Map(),
        this.computationStates,
        definition,
        executor,
        this.trace,
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

      this.computationStates.set(definition, prepared.state);
      context.initialDiagnostics.push(...prepared.diagnostics);
    }
  }

  /** 为全部宿主准备初始事务 token */
  private prepareInitialParticipants(context: RuntimeInitialContext): void {
    for (const participant of this.participants) {
      const executor = this.participantExecutors.get(participant);
      if (executor === undefined) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.InternalInvariant,
          message: 'runtime: missing participant executor',
          phase: 'participant-prepare',
          cause: participant,
        });
      }

      const invocation = createRuntimeParticipantInvocation(participant, this.trace);
      this.participantDrains.set(participant, invocation.takeDiagnostics);
      context.preparedParticipants.set(
        participant,
        prepareRuntimeParticipant(participant, executor, {
          invocation,
          phase: RuntimeComputationPhase.Initial,
          baseRevision: undefined,
          candidateRevision: this.currentRevision,
          sourceStates: this.sourceStates,
          computationStates: this.computationStates,
          diagnostics: context.initialParticipantDiagnostics,
        }),
      );
    }
  }

  /** 全部准备成功后提交初始宿主状态 */
  private commitInitialParticipants(context: RuntimeInitialContext): void {
    for (const participant of this.participants) {
      try {
        context.preparedParticipants.get(participant)?.prepared.commit();
      } catch (cause) {
        context.initialParticipantDiagnostics.push(
          ...(context.preparedParticipants.get(participant)?.takeDiagnostics() ?? []),
        );
        throw createRuntimeParticipantError(
          RetikzRuntimeErrorCode.ParticipantCommitFailed,
          'commit',
          participant,
          cause,
        );
      }

      context.initialParticipantDiagnostics.push(
        ...(context.preparedParticipants.get(participant)?.takeDiagnostics() ?? []),
      );
    }
  }

  /** 读取所有已提交宿主，任一失败仍由初始化事务统一回滚 */
  private readInitialParticipants(context: RuntimeInitialContext): void {
    const candidateReads = new Map<RuntimeCommitParticipantToken, unknown>();
    for (const participant of this.participants) {
      const executor = this.participantExecutors.get(participant);
      if (executor === undefined) continue;

      try {
        candidateReads.set(participant, executor.read());
      } catch (cause) {
        context.initialParticipantDiagnostics.push(
          ...(context.preparedParticipants.get(participant)?.takeDiagnostics() ?? []),
        );
        throw createRuntimeParticipantError(RetikzRuntimeErrorCode.ParticipantReadFailed, 'read', participant, cause);
      }

      context.initialParticipantDiagnostics.push(
        ...(context.preparedParticipants.get(participant)?.takeDiagnostics() ?? []),
      );
    }
    this.participantReads = candidateReads;
  }

  /** 初始化失败时分阶段回滚、释放事务 token、销毁宿主，最后退役计算与 Source */
  private rollbackInitial(context: RuntimeInitialContext, cause: unknown): never {
    /** 初始化失败不返回 Runtime：逆序回滚和释放临时 token，再释放宿主及计算、来源资源 */
    const failedDiagnostics: Array<RuntimeDiagnostic> = [
      ...context.initialDiagnostics.filter(isRuntimeExecutionDiagnostic),
      ...context.initialParticipantDiagnostics,
      ...(cause instanceof RetikzRuntimeError ? cause.diagnostics : []),
    ];

    for (const participant of [...this.participants].reverse()) {
      const participantState = context.preparedParticipants.get(participant);
      if (participantState === undefined) continue;

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

    for (const participant of [...this.participants].reverse()) {
      const participantState = context.preparedParticipants.get(participant);
      if (participantState === undefined) continue;

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

    for (const participant of [...this.participants].reverse()) {
      let participantDisposeFailure: Readonly<{ cause: unknown }> | undefined;

      try {
        this.participantExecutors.get(participant)?.dispose();
      } catch (disposeCause) {
        participantDisposeFailure = Object.freeze({ cause: disposeCause });
      }

      failedDiagnostics.push(...(this.participantDrains.get(participant)?.() ?? []));
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

    this.participantReads.clear();

    for (const definition of [...this.computations.definitions()].reverse()) {
      const prepared = this.computationStates.get(definition);
      if (prepared === undefined) continue;

      failedDiagnostics.push(...prepared.executor.retire(prepared.prepared));
    }

    for (const source of [...this.sources.definitions()].reverse()) {
      const prepared = this.sourceStates.get(source);
      if (prepared === undefined) continue;

      failedDiagnostics.push(
        ...prepared.command
          .retire(this.sourceExecutor, prepared.prepared)
          .diagnostics.map(mapRuntimeSourceLifecycleDiagnostic),
      );
    }

    throw withRuntimeFailureDiagnostics(cause, Object.freeze(failedDiagnostics));
  }

  /** 初始事务成功后通知观察者并释放临时 token，后置失败仅进入诊断 */
  private notifyInitial(context: RuntimeInitialContext): void {
    /** 初始化事务已成功，通知初始结果并释放临时 token；这些后置失败仅进入诊断队列 */
    context.initialDiagnostics.push(...context.initialParticipantDiagnostics);
    const frozenInitialDiagnostics = Object.freeze([...context.initialDiagnostics]);
    const completedInitialDiagnostics = [...context.initialDiagnostics];
    this.state = 'observing';

    for (const definition of this.computations.definitions()) {
      const computationState = this.computationStates.get(definition);
      if (computationState === undefined || computationState.executor.observeCommit === undefined) continue;

      const event: RuntimeCommitEvent<unknown> = Object.freeze({
        phase: RuntimeComputationPhase.Initial,
        revision: this.currentRevision,
        outcome: RuntimeComputationKind.Full,
        result: computationState.executor.snapshotToken(definition, computationState.prepared, this.currentRevision),
        diagnostics: frozenInitialDiagnostics,
      });

      try {
        computationState.executor.observeCommit<unknown>(event);
      } catch (cause) {
        completedInitialDiagnostics.push(createRuntimeObserverDiagnostic(definition, cause));
      }
    }

    for (const participant of [...this.participants].reverse()) {
      try {
        context.preparedParticipants.get(participant)?.prepared.dispose();
        completedInitialDiagnostics.push(...(context.preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
      } catch (cause) {
        completedInitialDiagnostics.push(...(context.preparedParticipants.get(participant)?.takeDiagnostics() ?? []));
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

    this.diagnosticQueue.push(...completedInitialDiagnostics);
    this.state = 'idle';
  }

  /** 沿拓扑传播实际变化和 full / fallback 执行结果 */
  private prepareUpdateComputations(context: RuntimeUpdateContext): void {
    /** 按拓扑顺序传播实际计算结果；上游 bailout 不进入 outcomes，也不单独触发下游 */
    for (const definition of this.computations.definitions()) {
      const executor = getRuntimeComputationRegistryExecutor(this.computations, definition);
      const directSourceChange = executor.sources.some(source => context.changedSources.has(source));
      const upstreamOutcomes = executor.computations
        .map(computation => context.computationOutcomes.get(computation))
        .filter((outcome): outcome is RuntimeComputationOutcome => outcome !== undefined);
      if (!directSourceChange && upstreamOutcomes.length === 0) continue;

      /** 上游 fallback 优先传播，其次是 full；其余按更新策略和 update 能力选择执行路径 */
      const upstreamFallback = upstreamOutcomes.some(outcome => outcome === RuntimeComputationKind.Fallback);
      const upstreamFull = upstreamOutcomes.some(outcome => outcome === RuntimeComputationKind.Full);
      const previous = this.computationStates.get(definition);
      if (previous === undefined) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.InternalInvariant,
          message: 'runtime: missing committed Computation state',
          phase: 'computation-update',
          cause: definition,
        });
      }

      const prepared = runRuntimeComputation(
        RuntimeComputationPhase.Update,
        this.currentRevision,
        context.candidateRevision,
        context.nextSourceStates,
        context.changedSources,
        context.changeSets,
        context.nextComputationStates,
        definition,
        executor,
        this.trace,
        upstreamFallback
          ? RuntimeComputationExecution.Fallback
          : this.updateStrategy === RuntimeUpdateStrategy.Full || upstreamFull || executor.update === undefined
            ? RuntimeComputationExecution.Full
            : RuntimeComputationExecution.Incremental,
        previous,
      );
      context.candidateDiagnostics.push(...prepared.diagnostics);
      if (prepared.state === undefined || prepared.outcome === undefined) continue;

      context.nextComputationStates.set(definition, prepared.state);
      context.computationOutcomes.set(definition, prepared.outcome);
    }
  }

  /** 按依赖变化和 revision 策略选择并准备参与者 */
  private prepareUpdateParticipants(context: RuntimeUpdateContext): void {
    /** continuous 参与每次实际推进的 revision；其余仅在声明的依赖受影响时参与 */
    for (const participant of this.participants) {
      const isAffected =
        participant.sources.some(source => context.changedSources.has(source)) ||
        participant.computations.some(computation => context.computationOutcomes.has(computation));
      if (participant.revisionPolicy !== 'continuous' && !isAffected) continue;

      context.selectedParticipants.push(participant);
      const executor = this.participantExecutors.get(participant);
      if (executor === undefined) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.InternalInvariant,
          message: 'runtime: missing participant executor',
          phase: 'participant-commit',
          cause: participant,
        });
      }

      const invocation = createRuntimeParticipantInvocation(participant, this.trace);
      this.participantDrains.set(participant, invocation.takeDiagnostics);
      context.preparedUpdateParticipants.set(
        participant,
        prepareRuntimeParticipant(participant, executor, {
          invocation,
          phase: RuntimeComputationPhase.Update,
          baseRevision: this.currentRevision,
          candidateRevision: context.candidateRevision,
          sourceStates: context.nextSourceStates,
          computationStates: context.nextComputationStates,
          diagnostics: context.candidateParticipantDiagnostics,
        }),
      );
    }
  }

  /** 全部候选准备成功后提交选中的宿主，尚不发布 Runtime 状态 */
  private commitUpdateParticipants(context: RuntimeUpdateContext): void {
    /** 全部 prepare 完成后再依次提交宿主；此时尚未发布 Runtime 的候选状态 */
    for (const participant of context.selectedParticipants) {
      try {
        context.preparedUpdateParticipants.get(participant)?.prepared.commit();
      } catch (cause) {
        context.candidateParticipantDiagnostics.push(
          ...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
        );
        throw createRuntimeParticipantError(
          RetikzRuntimeErrorCode.ParticipantCommitFailed,
          'commit',
          participant,
          cause,
        );
      }

      context.candidateParticipantDiagnostics.push(
        ...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
      );
    }
  }

  /** 收集选中宿主的提交后读值，读取失败仍回滚本次事务 */
  private readUpdateParticipants(context: RuntimeUpdateContext): void {
    /** 提交后读取也属于事务，任一 read 失败仍需回滚所有已准备的 Participant */
    for (const participant of context.selectedParticipants) {
      const executor = this.participantExecutors.get(participant);
      if (executor === undefined) continue;

      try {
        context.nextParticipantReads.set(participant, executor.read());
      } catch (cause) {
        context.candidateParticipantDiagnostics.push(
          ...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
        );
        throw createRuntimeParticipantError(RetikzRuntimeErrorCode.ParticipantReadFailed, 'read', participant, cause);
      }

      context.candidateParticipantDiagnostics.push(
        ...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
      );
    }
  }

  /** 回滚所有已准备宿主并清理新候选；回滚失败时封锁 Runtime */
  private rollbackUpdate(context: RuntimeUpdateContext, cause: unknown): never {
    /** 逆序回滚所有已准备 token（含尚未 commit 的项），再释放 token 和本次新建的候选资源 */
    const failedDiagnostics: Array<RuntimeDiagnostic> = [
      ...context.candidateDiagnostics.filter(isRuntimeExecutionDiagnostic),
      ...context.candidateParticipantDiagnostics,
      ...(cause instanceof RetikzRuntimeError ? cause.diagnostics : []),
    ];

    let firstRollbackFailure: Readonly<{ participant: RuntimeCommitParticipantToken; cause: unknown }> | undefined;

    for (const participant of [...context.selectedParticipants].reverse()) {
      const prepared = context.preparedUpdateParticipants.get(participant)?.prepared;
      if (prepared === undefined) continue;

      try {
        prepared.rollback();
        failedDiagnostics.push(...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
      } catch (rollbackCause) {
        failedDiagnostics.push(...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
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

    for (const participant of [...context.selectedParticipants].reverse()) {
      const prepared = context.preparedUpdateParticipants.get(participant)?.prepared;
      if (prepared === undefined) continue;

      try {
        prepared.dispose();
        failedDiagnostics.push(...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
      } catch (disposeCause) {
        failedDiagnostics.push(...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []));
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

    for (const definition of [...this.computations.definitions()].reverse()) {
      const candidate = context.nextComputationStates.get(definition);
      const previous = this.computationStates.get(definition);
      if (candidate === undefined || candidate === previous) continue;

      failedDiagnostics.push(...candidate.executor.retire(candidate.prepared));
    }

    for (const source of [...this.sources.definitions()].reverse()) {
      if (!context.changedSources.has(source)) continue;

      const candidate = context.nextSourceStates.get(source);
      const previous = this.sourceStates.get(source);
      if (candidate === undefined || candidate === previous) continue;

      failedDiagnostics.push(
        ...candidate.command
          .retire(this.sourceExecutor, candidate.prepared)
          .diagnostics.map(mapRuntimeSourceLifecycleDiagnostic),
      );
    }

    const frozenFailedDiagnostics = Object.freeze(failedDiagnostics);

    this.diagnosticQueue.push(...frozenFailedDiagnostics);

    /** 宿主回滚失败后封锁状态读写，仍可查询 revision、提取诊断与释放资源 */
    if (firstRollbackFailure !== undefined) {
      this.brokenError = new RetikzRuntimeError({
        code: RetikzRuntimeErrorCode.ParticipantRollbackFailed,
        phase: 'rollback',
        owner: firstRollbackFailure.participant.key,
        cause: Object.freeze({ trigger: cause, rollback: firstRollbackFailure.cause }),
        diagnostics: frozenFailedDiagnostics,
      });
      this.state = 'broken';

      throw this.brokenError;
    }

    throw withRuntimeFailureDiagnostics(cause, frozenFailedDiagnostics);
  }

  /** 通知本次产生新结果的计算，观察者失败不撤销已发布状态 */
  private notifyUpdate(
    context: RuntimeUpdateContext,
    baseRevision: RuntimeRevision,
    frozenDiagnostics: ReadonlyArray<RuntimeDiagnostic>,
  ): void {
    for (const definition of this.computations.definitions()) {
      const outcome = context.computationOutcomes.get(definition);
      if (outcome === undefined) continue;

      const computationState = this.computationStates.get(definition);
      if (computationState === undefined || computationState.executor.observeCommit === undefined) continue;

      const event: RuntimeCommitEvent<unknown> = Object.freeze({
        phase: RuntimeComputationPhase.Update,
        baseRevision,
        revision: this.currentRevision,
        outcome,
        result: computationState.executor.snapshotToken(definition, computationState.prepared, this.currentRevision),
        diagnostics: frozenDiagnostics,
      });

      try {
        computationState.executor.observeCommit<unknown>(event);
      } catch (cause) {
        context.candidateDiagnostics.push(createRuntimeObserverDiagnostic(definition, cause));
      }
    }
  }

  /** 逆序释放被替换的旧结果和来源，再释放本次事务 token */
  private retirePrevious(
    context: RuntimeUpdateContext,
    previousSourceStates: ReadonlyMap<RuntimeSourceToken, RuntimeSourceState>,
    previousComputationStates: ReadonlyMap<RuntimeComputationToken, RuntimeComputationState>,
  ): void {
    for (const definition of [...this.computations.definitions()].reverse()) {
      if (!context.computationOutcomes.has(definition)) continue;
      const previous = previousComputationStates.get(definition);
      if (previous === undefined) continue;

      context.candidateDiagnostics.push(...previous.executor.retire(previous.prepared));
    }

    for (const source of [...this.sources.definitions()].reverse()) {
      if (!context.changedSources.has(source)) continue;

      const previous = previousSourceStates.get(source);
      if (previous === undefined) continue;

      context.candidateDiagnostics.push(
        ...previous.command
          .retire(this.sourceExecutor, previous.prepared)
          .diagnostics.map(mapRuntimeSourceLifecycleDiagnostic),
      );
    }

    for (const participant of [...context.selectedParticipants].reverse()) {
      try {
        context.preparedUpdateParticipants.get(participant)?.prepared.dispose();
        context.candidateDiagnostics.push(
          ...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
        );
      } catch (cause) {
        context.candidateDiagnostics.push(
          ...(context.preparedUpdateParticipants.get(participant)?.takeDiagnostics() ?? []),
        );
        context.candidateDiagnostics.push(
          createRuntimeParticipantLifecycleDiagnostic(
            RetikzRuntimeErrorCode.ParticipantTokenDisposeFailed,
            'token-dispose',
            participant,
            cause,
          ),
        );
      }
    }
  }

  /** 同步发布候选和 revision，再通知观察者、退役旧资源并汇总结果 */
  private publishUpdate(context: RuntimeUpdateContext): RuntimeResult {
    /** 发布边界：全部宿主提交和读取已成功，一次同步替换当前状态与 revision */
    const previousSourceStates = this.sourceStates;
    const previousComputationStates = this.computationStates;
    context.candidateDiagnostics.push(...context.candidateParticipantDiagnostics);
    this.sourceStates = context.nextSourceStates;
    this.computationStates = context.nextComputationStates;
    this.participantReads = context.nextParticipantReads;
    const baseRevision = this.currentRevision;
    this.currentRevision = context.candidateRevision;
    const frozenDiagnostics = Object.freeze([...context.candidateDiagnostics]);

    /** 通知只看到已发布结果；observer 抛错追加诊断，不撤销提交，也不阻止其余通知 */
    this.state = 'observing';
    this.notifyUpdate(context, baseRevision, frozenDiagnostics);

    /** 通知完成后逆序退役被替换的旧资源，再释放事务 token；清理失败不回滚已发布状态 */
    this.state = 'retiring';
    this.retirePrevious(context, previousSourceStates, previousComputationStates);

    const resultDiagnostics = Object.freeze([...context.candidateDiagnostics]);
    this.diagnosticQueue.push(...resultDiagnostics);
    /** 汇总本次计算的最强执行路径；仅 Source / Participant 提交时返回 committed */
    const outcome: RuntimeResult['outcome'] = [...context.computationOutcomes.values()].includes(
      RuntimeComputationKind.Fallback,
    )
      ? RuntimeComputationKind.Fallback
      : [...context.computationOutcomes.values()].includes(RuntimeComputationKind.Full)
        ? RuntimeComputationKind.Full
        : [...context.computationOutcomes.values()].includes(RuntimeComputationKind.Incremental)
          ? RuntimeComputationKind.Incremental
          : 'committed';

    return Object.freeze({ revision: this.currentRevision, outcome, diagnostics: resultDiagnostics });
  }

  /** 逆序重试尚未释放的宿主，只消费已完成释放的 token */
  private disposePendingParticipants(): void {
    for (const participant of [...this.participants].reverse()) {
      if (!this.pendingParticipantDisposals.has(participant)) continue;

      let participantDisposeFailure: Readonly<{ cause: unknown }> | undefined;

      try {
        this.participantExecutors.get(participant)?.dispose();
      } catch (cause) {
        participantDisposeFailure = Object.freeze({ cause });
      }

      this.diagnosticQueue.push(...(this.participantDrains.get(participant)?.() ?? []));
      if (participantDisposeFailure !== undefined) {
        this.diagnosticQueue.push(
          createRuntimeParticipantLifecycleDiagnostic(
            RetikzRuntimeErrorCode.ParticipantDisposeFailed,
            'participant-dispose',
            participant,
            participantDisposeFailure.cause,
          ),
        );
        continue;
      }

      this.pendingParticipantDisposals.delete(participant);
      consumeRuntimeCommitParticipant(participant);
    }
  }
}

/**
 * 创建同步 Snapshot transaction runtime
 * @description 初始化按 Source → Computation → Participant prepare / commit / read 的顺序执行
 * 更新先在独立候选表中准备状态，所有 Participant 提交和读取成功后才发布状态与 revision
 * 发布后的 observer 与资源释放失败仅记录诊断；发布前失败则回滚，回滚失败后禁止继续读写
 * @param options 来源、计算、完整初始输入与可选参与者配置
 * @returns 已完成初始计算和参与者提交、revision 为 0 的同步 Runtime
 * @throws {RetikzRuntimeError} 注册绑定、初始输入或参与者无效，以及初始化执行或提交失败时抛出
 */
export const createRuntime = (options: RuntimeOptions): Runtime => {
  const manager = new RuntimeManager(options);
  return Object.freeze({
    revision: manager.revision,
    update: manager.update,
    snapshot: manager.snapshot,
    result: manager.result,
    participant: manager.participant,
    diagnostics: manager.diagnostics,
    dispose: manager.dispose,
  });
};
