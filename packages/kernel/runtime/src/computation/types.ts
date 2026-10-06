import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeDiagnosticPhase } from '../diagnostic';
import type { RuntimeComputationId } from '../identity';
import type { RuntimeChangeSet, RuntimeSourceDefinition, RuntimeSourceToken, RuntimeRevision } from '../source';
import type { RuntimeTracePhaseDefinition, RuntimeTraceReporter } from '../trace';
import type { RuntimeSnapshot } from '../transaction';
import type { RuntimeComputationExecution, RuntimeComputationKind, RuntimeComputationPhase } from './constants';

declare const RuntimeComputationTokenBrand: unique symbol;

declare const RuntimeComputationType: unique symbol;

/** 动态 graph lookup 只暴露的 opaque Computation token */
export type RuntimeComputationToken = Readonly<{
  /** 计算节点的身份 */
  id: RuntimeComputationId;
  /** 只允许 defineRuntimeComputation() 构造 token */
  [RuntimeComputationTokenBrand]: true;
}>;

/**
 * 保留 result 四组泛型关系的 typed Computation token
 * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
 * @template TResult capture 产生并由运行时持有和释放的计算结果类型；默认沿用 TResultInput
 * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型；默认沿用 TResult
 * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型；默认沿用 TResult
 */
export type RuntimeComputationDefinition<
  TResultInput,
  TResult = TResultInput,
  TComputationRead = TResult,
  TPublicRead = TResult,
> = RuntimeComputationToken &
  Readonly<{
    /** phantom 函数只承载泛型关系，不存在于运行时 token */
    [RuntimeComputationType]: (
      input: TResultInput,
      result: TResult,
      computationRead: TComputationRead,
      publicRead: TPublicRead,
    ) => void;
  }>;

/** Computation callback 可提交的无归属 warning 输入 */
export type RuntimeComputationWarningInput = Readonly<{
  /** 稳定 warning 分类 */
  code: string;
  /** 产生 warning 的领域阶段 */
  phase: RuntimeDiagnosticPhase;
  /** 面向开发者的 warning 信息 */
  message: string;
}>;

/** Computation callback 只能写入、不能 drain 的 Source-bound trace facade */
export type RuntimeComputationTraceReporter = Pick<RuntimeTraceReporter, 'owner' | 'report'>;

/** Computation callback 可用的 trace 与 warning context */
export type RuntimeComputationContext = Readonly<{
  /** 当前 callback 的实际执行方式 */
  execution: RuntimeComputationExecution;
  /** 固定绑定 Computation Source 的 trace reporter */
  trace: RuntimeComputationTraceReporter;
  /** 追加由 Runtime 统一归属的 commit-safe warning */
  diagnose: (diagnostic: RuntimeComputationWarningInput) => void;
}>;

/** CandidateView 的 typed Source 与 Computation lookup */
export type RuntimeCandidateLookup = Readonly<{
  /**
   * 读取已声明 Source 的 candidate Snapshot
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
   * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
   */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /** 判断已声明 Source 是否在当前 candidate transaction 中发生实际变化 */
  isChanged: (source: RuntimeSourceToken) => boolean;
  /**
   * 读取已通过 Runtime envelope/revision 校验的 change hint；领域完整性由 Source validator 或 Computation 校验
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
   * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
   */
  changeSet: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeChangeSet<TChange> | undefined;
  /**
   * 读取已声明 upstream Computation 的 public result view
   * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型
   * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
   */
  result: <TResultInput, TResult, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
}>;

/** Computation prepare 期间只读且带 phase 的 candidate view */
export type RuntimeCandidateView =
  | (RuntimeCandidateLookup &
      Readonly<{
        /** initial runtime 的 full prepare */
        phase: typeof RuntimeComputationPhase.Initial;
        /** initial candidate 不存在 base revision */
        baseRevision?: never;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>)
  | (RuntimeCandidateLookup &
      Readonly<{
        /** 已有 runtime 的 update prepare */
        phase: typeof RuntimeComputationPhase.Update;
        /** update 基于的 current revision */
        baseRevision: RuntimeRevision;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>);

/**
 * full Computation 执行产生的新 result 输入
 * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
 */
export type RuntimeRunOutcome<TResultInput> = Readonly<{
  /** full 执行判别字段 */
  kind: typeof RuntimeComputationKind.Full;
  /** 交给 result capture 的新输入 */
  result: TResultInput;
}>;

/**
 * incremental Computation 执行的三种可观察结果
 * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
 */
export type RuntimeUpdateOutcome<TResultInput> =
  | Readonly<{
      /** incremental 执行判别字段 */
      kind: typeof RuntimeComputationKind.Incremental;
      /** 交给 result capture 的新输入 */
      result: TResultInput;
    }>
  | Readonly<{
      /** 复用 committed result 的判别字段 */
      kind: typeof RuntimeComputationKind.Bailout;
    }>
  | Readonly<{
      /** 放弃增量路径并执行 full run 的判别字段 */
      kind: typeof RuntimeComputationKind.Fallback;
      /** 随成功 full 结果提交的可选 warnings */
      diagnostics?: ReadonlyArray<RuntimeComputationWarningInput>;
    }>;

/**
 * Computation result 的 capture、双层 read 与释放契约
 * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
 * @template TResult capture 产生并由运行时持有和释放的计算结果类型；默认沿用 TResultInput
 * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型；默认沿用 TResult
 * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型；默认沿用 TResult
 */
export type RuntimeComputationResultDefinitionInput<
  TResultInput,
  TResult = TResultInput,
  TComputationRead = TResult,
  TPublicRead = TResult,
> = Readonly<{
  /**
   * 捕获 runtime-owned result；同类型时可省略，不复制或冻结
   * @default (input) => input
   */
  capture?: (input: TResultInput) => TResult;
  /**
   * 产生只供本 Computation update 使用的 private read；同类型时可省略
   * @default (result) => result
   */
  readForComputation?: (result: TResult) => TComputationRead;
  /**
   * 产生依赖 Computation 与宿主可见的 public read；同类型时可省略
   * @default (result) => result
   */
  read?: (result: TResult) => TPublicRead;
  /** 释放未发布或已替换的 result */
  dispose?: (result: TResult) => void;
}> &
  RuntimeRequiredResultTransform<'capture', TResultInput, TResult> &
  RuntimeRequiredResultTransform<'readForComputation', TResult, TComputationRead> &
  RuntimeRequiredResultTransform<'read', TResult, TPublicRead>;

/** 仅输入与输出类型一致时允许省略恒等转换 */
type RuntimeRequiredResultTransform<TKey extends string, TInput, TOutput> = [TInput, TOutput] extends [TOutput, TInput]
  ? unknown
  : Readonly<Record<TKey, (input: TInput) => TOutput>>;

/** 三层转换均可省略时允许省略整个 result 配置 */
type RuntimeRequiredComputationResult<TResultInput, TResult, TComputationRead, TPublicRead> =
  Record<never, never> extends RuntimeComputationResultDefinitionInput<
    TResultInput,
    TResult,
    TComputationRead,
    TPublicRead
  >
    ? unknown
    : Readonly<{
        result: RuntimeComputationResultDefinitionInput<TResultInput, TResult, TComputationRead, TPublicRead>;
      }>;

/**
 * Computation commit observer 接收的 revision-bound 事件
 * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
 */
export type RuntimeCommitEvent<TPublicRead> =
  | Readonly<{
      /** 初始提交判别字段 */
      phase: typeof RuntimeComputationPhase.Initial;
      /** 初始提交不存在 base revision */
      baseRevision?: never;
      /** 已发布的 runtime revision */
      revision: RuntimeRevision;
      /** 初始 Computation 固定使用 full outcome */
      outcome: typeof RuntimeComputationKind.Full;
      /** 已发布 result 的 public Snapshot */
      result: RuntimeSnapshot<TPublicRead>;
      /** publish 前冻结的 commit-safe diagnostics */
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>
  | Readonly<{
      /** 更新提交判别字段 */
      phase: typeof RuntimeComputationPhase.Update;
      /** update 基于的 previous revision */
      baseRevision: RuntimeRevision;
      /** 已发布的 next revision */
      revision: RuntimeRevision;
      /** 当前 Computation 的实际执行结果 */
      outcome: Exclude<RuntimeComputationKind, typeof RuntimeComputationKind.Bailout>;
      /** 已发布 result 的 public Snapshot */
      result: RuntimeSnapshot<TPublicRead>;
      /** publish 前冻结的 commit-safe diagnostics */
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>;

/**
 * Runtime Computation Definition 的作者侧输入
 * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
 * @template TResult capture 产生并由运行时持有和释放的计算结果类型；默认沿用 TResultInput
 * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型；默认沿用 TResult
 * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型；默认沿用 TResult
 */
export type RuntimeComputationDefinitionInput<
  TResultInput,
  TResult = TResultInput,
  TComputationRead = TResult,
  TPublicRead = TResult,
> = Readonly<{
  /** Computation 的结构化 identity */
  id: RuntimeComputationId;
  /** Computation 声明读取的 Source tokens */
  sources: ReadonlyArray<RuntimeSourceToken>;
  /**
   * Computation 声明读取的 upstream Computation tokens
   * @default []
   */
  computations?: ReadonlyArray<RuntimeComputationToken>;
  /**
   * Computation callback 允许发出的 trace phases
   * @default []
   */
  tracePhases?: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** Computation result 生命周期；三层转换类型相同且无需释放资源时可整体省略 */
  result?: RuntimeComputationResultDefinitionInput<TResultInput, TResult, TComputationRead, TPublicRead>;
  /** full 执行入口 */
  run: (view: RuntimeCandidateView, context: RuntimeComputationContext) => RuntimeRunOutcome<TResultInput>;
  /** 可选 incremental 执行入口 */
  update?: (
    previous: TComputationRead,
    view: RuntimeCandidateView,
    context: RuntimeComputationContext,
  ) => RuntimeUpdateOutcome<TResultInput>;
  /** 成功发布新 result 后的隔离 observer */
  observeCommit?: (event: RuntimeCommitEvent<TPublicRead>) => void;
}> &
  RuntimeRequiredComputationResult<TResultInput, TResult, TComputationRead, TPublicRead>;
