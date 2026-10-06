import type {
  RuntimeComputationDefinition,
  RuntimeComputationPhase,
  RuntimeComputationToken,
  RuntimeComputationTraceReporter,
} from '../computation';
import type { RuntimeDiagnosticPhase } from '../diagnostic';
import type { RuntimeSourceDefinition, RuntimeSourceToken, RuntimeRevision } from '../source';
import type { RuntimeTracePhaseDefinition } from '../trace';
import type { RuntimeSnapshot } from '../transaction';

declare const RuntimeCommitParticipantTokenBrand: unique symbol;

declare const RuntimeCommitParticipantReadBrand: unique symbol;

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
  [RuntimeCommitParticipantTokenBrand]: true;
}>;

/**
 * 保留 committed public read 类型的 participant token
 * @template TRead 提交参与者对宿主暴露的已提交只读视图类型
 */
export type RuntimeCommitParticipant<TRead> = RuntimeCommitParticipantToken &
  Readonly<{
    /** phantom 函数只承载 read 类型，不存在于运行时 token */
    [RuntimeCommitParticipantReadBrand]: (read: TRead) => TRead;
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
export type RuntimeParticipantWarningInput = Readonly<{
  /** 稳定 warning 分类 */
  code: string;
  /** 产生 warning 的领域阶段 */
  phase: RuntimeDiagnosticPhase;
  /** 面向开发者的 warning 信息 */
  message: string;
}>;

/** participant callback 只能写入、不能 drain 的 trace facade */
export type RuntimeParticipantTraceReporter = RuntimeComputationTraceReporter;

/** participant prepare callback 可用的 trace 与 warning context */
export type RuntimeParticipantContext = Readonly<{
  /** 固定绑定 participant key 的 trace reporter */
  trace: RuntimeParticipantTraceReporter;
  /** 追加由 Runtime 统一归属的 commit-safe warning */
  diagnose: (warning: RuntimeParticipantWarningInput) => void;
}>;

/** participant candidate 只允许读取已声明依赖 */
export type RuntimeParticipantCandidateLookup = Readonly<{
  /**
   * 读取 Source candidate Snapshot
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead 提交参与者对宿主暴露的已提交只读视图类型
   * @template TChange 领域变更提示的单项类型，由消费它的计算校验并用于增量处理
   */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /**
   * 读取 Computation candidate public result Snapshot
   * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型
   * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
   */
  result: <TResultInput, TResult, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
}>;

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
export type RuntimeCommitParticipantDefinitionInput<TRead> = Readonly<{
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
  prepare: RuntimeCommitParticipantDefinitionInput<unknown>['prepare'];
  /** 读取参与者已提交的公开状态 */
  read: RuntimeCommitParticipantDefinitionInput<unknown>['read'];
  /** 释放参与者持有的宿主状态 */
  dispose: RuntimeCommitParticipantDefinitionInput<unknown>['dispose'];
}>;
