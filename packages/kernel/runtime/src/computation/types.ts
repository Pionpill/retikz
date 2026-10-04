import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeDiagnosticPhaseValue } from '../diagnostic';
import type { RuntimeComputationId } from '../identity';
import type { RuntimeChangeSet, RuntimeSourceDefinition, RuntimeSourceToken, RuntimeRevision } from '../source';
import type { RuntimeTracePhaseDefinition, RuntimeTraceReporter } from '../trace';
import type { RuntimeSnapshot } from '../transaction';
import type {
  RuntimeComputationExecutionValue,
  RuntimeComputationKind,
  RuntimeComputationKindValue,
  RuntimeComputationPhase,
} from './constants';

declare const RuntimeComputationTokenBrand: unique symbol;
declare const RuntimeComputationType: unique symbol;

/** 动态 graph lookup 只暴露的 opaque Computation token */
export type RuntimeComputationToken = Readonly<{
  /** Computation identity */
  id: RuntimeComputationId;
  /** 只允许 defineRuntimeComputation() 构造 token */
  [RuntimeComputationTokenBrand]: true;
}>;

/** 保留 artifact 四组泛型关系的 typed Computation token */
export type RuntimeComputationDefinition<
  TArtifactInput,
  TArtifact = TArtifactInput,
  TComputationRead = TArtifact,
  TPublicRead = TArtifact,
> = RuntimeComputationToken &
  Readonly<{
    /** phantom 函数只承载泛型关系，不存在于运行时 token */
    [RuntimeComputationType]: (
      input: TArtifactInput,
      artifact: TArtifact,
      computationRead: TComputationRead,
      publicRead: TPublicRead,
    ) => void;
  }>;

/** Computation callback 可提交的无归属 warning 输入 */
export type RuntimeComputationWarningInput = Readonly<{
  /** 稳定 warning 分类 */
  code: string;
  /** 产生 warning 的领域阶段 */
  phase: RuntimeDiagnosticPhaseValue;
  /** 面向开发者的 warning 信息 */
  message: string;
}>;

/** Computation callback 只能写入、不能 drain 的 Source-bound trace facade */
export type RuntimeComputationTraceReporter = Pick<RuntimeTraceReporter, 'owner' | 'report'>;

/** Computation callback 可用的 trace 与 warning context */
export type RuntimeComputationContext = Readonly<{
  /** 当前 callback 的实际执行方式 */
  execution: RuntimeComputationExecutionValue;
  /** 固定绑定 Computation Source 的 trace reporter */
  trace: RuntimeComputationTraceReporter;
  /** 追加由 Runtime 统一归属的 commit-safe warning */
  diagnose: (diagnostic: RuntimeComputationWarningInput) => void;
}>;

/** CandidateView 的 typed Source 与 Computation lookup */
export type RuntimeCandidateLookup = Readonly<{
  /** 读取已声明 Source 的 candidate Snapshot */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /** 判断已声明 Source 是否在当前 candidate transaction 中发生实际变化 */
  changed: (source: RuntimeSourceToken) => boolean;
  /** 读取已通过 Runtime envelope/revision 校验的 change hint；领域完整性由 Source validator 或 Computation 校验 */
  changeSet: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeChangeSet<TChange> | undefined;
  /** 读取已声明 upstream Computation 的 public artifact view */
  artifact: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
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

/** full Computation 执行产生的新 artifact 输入 */
export type RuntimeRunResult<TArtifactInput> = Readonly<{
  /** full 执行判别字段 */
  kind: typeof RuntimeComputationKind.Full;
  /** 交给 artifact capture 的新输入 */
  artifact: TArtifactInput;
}>;

/** incremental Computation 执行的三种可观察结果 */
export type RuntimeUpdateResult<TArtifactInput> =
  | Readonly<{
      /** incremental 执行判别字段 */
      kind: typeof RuntimeComputationKind.Incremental;
      /** 交给 artifact capture 的新输入 */
      artifact: TArtifactInput;
    }>
  | Readonly<{
      /** 复用 committed artifact 的判别字段 */
      kind: typeof RuntimeComputationKind.Bailout;
    }>
  | Readonly<{
      /** 放弃增量路径并执行 full run 的判别字段 */
      kind: typeof RuntimeComputationKind.Fallback;
      /** 随成功 full 结果提交的可选 warnings */
      diagnostics?: ReadonlyArray<RuntimeComputationWarningInput>;
    }>;

/** Computation artifact 的 capture、双层 read 与释放契约 */
export type RuntimeComputationArtifactDefinitionInput<
  TArtifactInput,
  TArtifact = TArtifactInput,
  TComputationRead = TArtifact,
  TPublicRead = TArtifact,
> = Readonly<{
  /**
   * 捕获 runtime-owned artifact；同类型时可省略，不复制或冻结
   * @default (input) => input
   */
  capture?: (input: TArtifactInput) => TArtifact;
  /**
   * 产生只供本 Computation update 使用的 private read；同类型时可省略
   * @default (artifact) => artifact
   */
  readForComputation?: (artifact: TArtifact) => TComputationRead;
  /**
   * 产生依赖 Computation 与宿主可见的 public read；同类型时可省略
   * @default (artifact) => artifact
   */
  read?: (artifact: TArtifact) => TPublicRead;
  /** 释放未发布或已替换的 artifact */
  dispose?: (artifact: TArtifact) => void;
}> &
  RuntimeRequiredArtifactTransform<'capture', TArtifactInput, TArtifact> &
  RuntimeRequiredArtifactTransform<'readForComputation', TArtifact, TComputationRead> &
  RuntimeRequiredArtifactTransform<'read', TArtifact, TPublicRead>;

/** 仅输入与输出类型一致时允许省略恒等转换 */
type RuntimeRequiredArtifactTransform<TKey extends string, TInput, TOutput> = [TInput, TOutput] extends [
  TOutput,
  TInput,
]
  ? unknown
  : Readonly<Record<TKey, (input: TInput) => TOutput>>;

/** 三层转换均可省略时允许省略整个 artifact 配置 */
type RuntimeRequiredComputationArtifact<TArtifactInput, TArtifact, TComputationRead, TPublicRead> =
  Record<never, never> extends RuntimeComputationArtifactDefinitionInput<
    TArtifactInput,
    TArtifact,
    TComputationRead,
    TPublicRead
  >
    ? unknown
    : Readonly<{
        artifact: RuntimeComputationArtifactDefinitionInput<TArtifactInput, TArtifact, TComputationRead, TPublicRead>;
      }>;

/** Computation commit observer 接收的 revision-bound 事件 */
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
      /** 已发布 artifact 的 public Snapshot */
      artifact: RuntimeSnapshot<TPublicRead>;
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
      outcome: Exclude<RuntimeComputationKindValue, typeof RuntimeComputationKind.Bailout>;
      /** 已发布 artifact 的 public Snapshot */
      artifact: RuntimeSnapshot<TPublicRead>;
      /** publish 前冻结的 commit-safe diagnostics */
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>;

/** Runtime Computation Definition 的作者侧输入 */
export type RuntimeComputationDefinitionInput<
  TArtifactInput,
  TArtifact = TArtifactInput,
  TComputationRead = TArtifact,
  TPublicRead = TArtifact,
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
  /** Computation artifact 生命周期；三层转换类型相同且无需释放资源时可整体省略 */
  artifact?: RuntimeComputationArtifactDefinitionInput<TArtifactInput, TArtifact, TComputationRead, TPublicRead>;
  /** full 执行入口 */
  run: (view: RuntimeCandidateView, context: RuntimeComputationContext) => RuntimeRunResult<TArtifactInput>;
  /** 可选 incremental 执行入口 */
  update?: (
    previous: TComputationRead,
    view: RuntimeCandidateView,
    context: RuntimeComputationContext,
  ) => RuntimeUpdateResult<TArtifactInput>;
  /** 成功发布新 artifact 后的隔离 observer */
  observeCommit?: (event: RuntimeCommitEvent<TPublicRead>) => void;
}> &
  RuntimeRequiredComputationArtifact<TArtifactInput, TArtifact, TComputationRead, TPublicRead>;
