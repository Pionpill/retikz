import type {
  RuntimeComputationDefinition,
  RuntimeComputationPhase,
  RuntimeComputationToken,
  RuntimeComputationTraceReporter,
} from '../computation';
import type { RuntimeDiagnosticPhaseValue } from '../diagnostic';
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

/** 保留 committed public read 类型的 participant token */
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
  phase: RuntimeDiagnosticPhaseValue;
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
  /** 读取 Source candidate Snapshot */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /** 读取 Computation candidate public artifact Snapshot */
  artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
}>;

/** participant prepare 期间只读且带 phase 的 candidate view */
export type RuntimeParticipantCandidateView =
  | (RuntimeParticipantCandidateLookup &
      Readonly<{
        /** initial runtime candidate */
        phase: typeof RuntimeComputationPhase.Initial;
        /** initial candidate 不存在 base revision */
        baseRevision?: never;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>)
  | (RuntimeParticipantCandidateLookup &
      Readonly<{
        /** update runtime candidate */
        phase: typeof RuntimeComputationPhase.Update;
        /** update 基于的 current revision */
        baseRevision: RuntimeRevision;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>);

/** Runtime commit participant 的作者侧输入 */
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
  prepare: RuntimeCommitParticipantDefinitionInput<unknown>['prepare'];
  read: RuntimeCommitParticipantDefinitionInput<unknown>['read'];
  dispose: RuntimeCommitParticipantDefinitionInput<unknown>['dispose'];
}>;
