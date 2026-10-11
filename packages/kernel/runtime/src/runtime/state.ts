import type {
  RuntimeComputationErasedExecutor,
  RuntimeComputationKind,
  RuntimeComputationPhase,
  RuntimeComputationToken,
  RuntimePreparedComputationResult,
} from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeCommitParticipantToken, RuntimePreparedCommit } from '../participant';
import type { RuntimePreparedSourceValue, RuntimeRevision, RuntimeSourceToken } from '../source';
import type { RuntimeSourceCommandExecutor } from '../transaction';

/** Runtime 持有的 Source command 与已准备值 */
export type RuntimeSourceState = Readonly<{
  /** 用于候选读取与资源退休的 Source command */
  command: RuntimeSourceCommandExecutor;
  /** Runtime 已接管的 Source 值与只读视图 */
  prepared: RuntimePreparedSourceValue<unknown, unknown>;
}>;

/** Runtime 持有的 Computation executor 与已准备结果 */
export type RuntimeComputationState = Readonly<{
  /** 产生此结果的 Computation token */
  definition: RuntimeComputationToken;
  /** 捕获结果、读取与释放的执行入口 */
  executor: RuntimeComputationErasedExecutor;
  /** Runtime 已接管的计算结果与两层只读视图 */
  prepared: RuntimePreparedComputationResult<unknown, unknown, unknown>;
}>;

/** 单次 participant 提交及其诊断读取入口 */
export type RuntimePreparedParticipantState = Readonly<{
  /** 本轮可回滚的提交对象 */
  prepared: RuntimePreparedCommit;
  /** 消费该参与者本轮尚未读取的诊断 */
  takeDiagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
}>;

/** 已产生候选结果的计算执行分类 */
export type RuntimeComputationOutcome = Exclude<RuntimeComputationKind, typeof RuntimeComputationKind.Bailout>;

/** Runtime 的生命周期与读写门禁状态 */
export type RuntimeState =
  | 'preparing'
  | 'idle'
  | 'observing'
  | 'retiring'
  | 'broken'
  | 'disposing'
  | 'dispose-pending'
  | 'disposed';

/** 初始化期间的临时诊断与宿主事务，不存入实例字段 */
export type RuntimeInitialContext = Readonly<{
  /** 初始计算诊断 */
  initialDiagnostics: Array<RuntimeDiagnostic>;
  /** 本次初始化私有的宿主事务 */
  participantTransaction: RuntimeParticipantTransactionContext;
}>;

/** Source 候选准备阶段所需的事务状态 */
export type RuntimeSourceUpdateContext = Readonly<{
  /** 完整候选 Source 表，未变化项复用当前状态 */
  nextSourceStates: Map<RuntimeSourceToken, RuntimeSourceState>;
  /** 实际变化的 Source */
  changedSources: Set<RuntimeSourceToken>;
  /** 实际变化 Source 携带的可选提示 */
  changeSets: Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>;
  /** 本次候选及后置阶段的诊断 */
  candidateDiagnostics: Array<RuntimeDiagnostic>;
}>;

/** 一次更新私有的候选状态与宿主事务，发布前不替换当前状态 */
export type RuntimeUpdateContext = RuntimeSourceUpdateContext &
  Readonly<{
    /** 成功发布时推进到的版本 */
    candidateRevision: RuntimeRevision;
    /** 完整候选计算结果表 */
    nextComputationStates: Map<RuntimeComputationToken, RuntimeComputationState>;
    /** 本次实际产生新结果的计算执行分类 */
    computationOutcomes: Map<RuntimeComputationToken, RuntimeComputationOutcome>;
    /** 本次更新私有的宿主事务 */
    participantTransaction: RuntimeParticipantTransactionContext;
    /** 成功读取后待发布的宿主视图 */
    nextParticipantReads: Map<RuntimeCommitParticipantToken, unknown>;
  }>;

/** 单次 Participant 事务，成功与失败阶段复用同一批准备记录 */
export type RuntimeParticipantTransactionContext = Readonly<{
  /** 按正序选择的宿主，失败的准备项也保留选择记录 */
  selectedParticipants: Array<RuntimeCommitParticipantToken>;
  /** 已成功返回的事务 token */
  preparedParticipants: Map<RuntimeCommitParticipantToken, RuntimePreparedParticipantState>;
  /** 宿主诊断，失败事务仍保留 */
  diagnostics: Array<RuntimeDiagnostic>;
}>;

/** 首个宿主回滚失败，由 Runtime 决定如何封锁后续读写 */
export type RuntimeParticipantRollbackFailure = Readonly<{
  /** 回滚失败的宿主 */
  participant: RuntimeCommitParticipantToken;
  /** 原始回滚异常 */
  cause: unknown;
}>;

/** 参与者准备所需的候选状态，不包含 Runtime 可变实例 */
export type RuntimeParticipantCandidateContext = Readonly<{
  /** 初始化或更新阶段 */
  phase: RuntimeComputationPhase;
  /** 初始化时不存在基准版本 */
  baseRevision: RuntimeRevision | undefined;
  /** 候选发布后的版本 */
  candidateRevision: RuntimeRevision;
  /** 候选来源 */
  sourceStates: ReadonlyMap<RuntimeSourceToken, RuntimeSourceState>;
  /** 候选计算结果 */
  computationStates: ReadonlyMap<RuntimeComputationToken, RuntimeComputationState>;
}>;
