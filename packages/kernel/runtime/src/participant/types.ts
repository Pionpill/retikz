import type {
  RuntimeCandidateLookup,
  RuntimeComputationContext,
  RuntimeComputationPhase,
  RuntimeComputationToken,
  RuntimeComputationTraceReporter,
} from '../computation';
import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeSourceToken, RuntimeRevision } from '../source';
import type { RuntimeTracePhaseDefinition } from '../trace';

declare const runtimeCommitParticipantTokenBrand: unique symbol;

declare const runtimeCommitParticipantReadBrand: unique symbol;

/** 动态 runtime options 只暴露的 commit participant token */
export type RuntimeCommitParticipantToken = Readonly<{
  /** participant 的稳定唯一 key */
  key: string;
  /** participant 声明读取的 Source tokens */
  sources: ReadonlyArray<RuntimeSourceToken>;
  /** participant 声明读取的 Computation tokens */
  computations: ReadonlyArray<RuntimeComputationToken>;
  /** participant 的 update 选择策略 */
  revisionPolicy: 'affected' | 'continuous';
  /** participant 允许发射的 trace phases */
  tracePhases: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** 只允许 defineRuntimeCommitParticipant() 构造 token */
  [runtimeCommitParticipantTokenBrand]: true;
}>;

/**
 * 保留 committed public read 类型的 participant token
 * @template TRead 提交参与者对宿主暴露的已提交只读视图类型
 */
export type RuntimeCommitParticipant<TRead> = RuntimeCommitParticipantToken &
  Readonly<{
    /** phantom 函数只承载 read 类型，不存在于运行时 token */
    [runtimeCommitParticipantReadBrand]: (read: TRead) => TRead;
  }>;

/** participant prepare 产生的单次 transaction token */
export type RuntimePreparedCommit = Readonly<{
  /** 应用已完成领域校验的 staging state */
  commit: () => void;
  /** 恢复 commit 前状态 */
  rollback: () => void;
  /** 释放本次 transaction token */
  dispose: () => void;
}>;

/** participant callback 可提交的 warning 输入 */
export type InputRuntimeParticipantWarning = Pick<RuntimeDiagnostic, 'code' | 'phase' | 'message'>;

/** participant callback 只能写入、不能 drain 的 trace facade */
export type RuntimeParticipantTraceReporter = RuntimeComputationTraceReporter;

/** participant prepare callback 可用的 trace 与 warning context */
export type RuntimeParticipantContext = Pick<RuntimeComputationContext, 'trace' | 'diagnose'>;

/** participant candidate 只允许读取已声明依赖 */
export type RuntimeParticipantCandidateLookup = Pick<RuntimeCandidateLookup, 'snapshot' | 'result'>;

/** participant prepare 期间只读且带 phase 的 candidate view */
export type RuntimeParticipantCandidateView =
  | (RuntimeParticipantCandidateLookup &
      Readonly<{
        /** 初始化运行时使用的候选状态 */
        phase: typeof RuntimeComputationPhase.Initial;
        /** initial candidate 不存在 base revision */
        baseRevision?: never;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>)
  | (RuntimeParticipantCandidateLookup &
      Readonly<{
        /** 运行时更新使用的候选状态 */
        phase: typeof RuntimeComputationPhase.Update;
        /** update 基于的 current revision */
        baseRevision: RuntimeRevision;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>);

/**
 * Runtime commit participant 的作者侧输入
 * @template TRead 提交参与者对宿主暴露的已提交只读视图类型
 */
export type InputRuntimeCommitParticipantDefinition<TRead> = Readonly<{
  /** participant 的稳定唯一 key */
  key: string;
  /**
   * participant 声明读取的 Source tokens
   * @default []
   */
  sources?: ReadonlyArray<RuntimeSourceToken>;
  /**
   * participant 声明读取的 Computation tokens
   * @default []
   */
  computations?: ReadonlyArray<RuntimeComputationToken>;
  /** participant 的 update 选择策略 */
  revisionPolicy: 'affected' | 'continuous';
  /**
   * participant 允许发射的 trace phases
   * @default []
   */
  tracePhases?: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** 为 candidate staging 一次可回滚 commit */
  prepare: (candidate: RuntimeParticipantCandidateView, context: RuntimeParticipantContext) => RuntimePreparedCommit;
  /** 生成与已 commit view 对应的 immutable public read */
  read: () => TRead;
  /** 释放 participant 持有的宿主状态 */
  dispose: () => void;
}>;

/** participant 私有 executor 的类型擦除视图 */
export type RuntimeCommitParticipantExecutor = Readonly<{
  /** 为候选状态准备可回滚的参与者提交事务 */
  prepare: InputRuntimeCommitParticipantDefinition<unknown>['prepare'];
  /** 读取参与者已提交的公开状态 */
  read: InputRuntimeCommitParticipantDefinition<unknown>['read'];
  /** 释放参与者持有的宿主状态 */
  dispose: InputRuntimeCommitParticipantDefinition<unknown>['dispose'];
}>;
