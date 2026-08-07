import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeDiagnosticPhaseValue } from '../diagnostic';
import type { RuntimeProgramId } from '../identity';
import type { RuntimeChangeSet, RuntimeOwnerDefinition, RuntimeOwnerToken, RuntimeRevision } from '../owner';
import type { RuntimeTracePhaseDefinition, RuntimeTraceReporter } from '../trace';
import type { RuntimeSnapshot } from '../transaction';
import type {
  RuntimeProgramExecutionValue,
  RuntimeProgramKind,
  RuntimeProgramKindValue,
  RuntimeProgramPhase,
} from './constants';

declare const RuntimeProgramTokenBrand: unique symbol;
declare const RuntimeProgramType: unique symbol;

/** 动态 graph lookup 只暴露的 opaque Program token */
export type RuntimeProgramToken = Readonly<{
  /** Program identity */
  id: RuntimeProgramId;
  /** 只允许 defineRuntimeProgram() 构造 token */
  [RuntimeProgramTokenBrand]: true;
}>;

/** 保留 artifact 四组泛型关系的 typed Program token */
export type RuntimeProgramDefinition<
  TArtifactInput,
  TArtifact,
  TProgramRead,
  TPublicRead = TProgramRead,
> = RuntimeProgramToken &
  Readonly<{
    /** phantom 函数只承载泛型关系，不存在于运行时 token */
    [RuntimeProgramType]: (
      input: TArtifactInput,
      artifact: TArtifact,
      programRead: TProgramRead,
      publicRead: TPublicRead,
    ) => void;
  }>;

/** Program callback 可提交的无归属 warning 输入 */
export type RuntimeProgramWarningInput = Readonly<{
  /** 稳定 warning 分类 */
  code: string;
  /** 产生 warning 的领域阶段 */
  phase: RuntimeDiagnosticPhaseValue;
  /** 面向开发者的 warning 信息 */
  message: string;
}>;

/** Program callback 只能写入、不能 drain 的 owner-bound trace facade */
export type RuntimeProgramTraceReporter = Pick<RuntimeTraceReporter, 'owner' | 'report'>;

/** Program callback 可用的 trace 与 warning context */
export type RuntimeProgramContext = Readonly<{
  /** 当前 callback 的实际执行方式 */
  execution: RuntimeProgramExecutionValue;
  /** 固定绑定 Program owner 的 trace reporter */
  trace: RuntimeProgramTraceReporter;
  /** 追加由 Runtime 统一归属的 commit-safe warning */
  diagnose: (diagnostic: RuntimeProgramWarningInput) => void;
}>;

/** CandidateView 的 typed owner 与 Program lookup */
export type RuntimeCandidateLookup = Readonly<{
  /** 读取已声明 owner 的 candidate Snapshot */
  snapshot: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  /** 判断已声明 owner 是否在当前 candidate transaction 中发生实际变化 */
  changed: (owner: RuntimeOwnerToken) => boolean;
  /** 读取已通过 Runtime envelope/revision 校验的 change hint；领域完整性由 Owner validator 或 Program 校验 */
  changeSet: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeChangeSet<TChange> | undefined;
  /** 读取已声明 upstream Program 的 public artifact view */
  artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
}>;

/** Program prepare 期间只读且带 phase 的 candidate view */
export type RuntimeCandidateView =
  | (RuntimeCandidateLookup &
      Readonly<{
        /** initial session 的 full prepare */
        phase: typeof RuntimeProgramPhase.Initial;
        /** initial candidate 不存在 base revision */
        baseRevision?: never;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>)
  | (RuntimeCandidateLookup &
      Readonly<{
        /** 已有 session 的 update prepare */
        phase: typeof RuntimeProgramPhase.Update;
        /** update 基于的 current revision */
        baseRevision: RuntimeRevision;
        /** candidate 完整发布后使用的 revision */
        candidateRevision: RuntimeRevision;
      }>);

/** full Program 执行产生的新 artifact 输入 */
export type RuntimeRunResult<TArtifactInput> = Readonly<{
  /** full 执行判别字段 */
  kind: typeof RuntimeProgramKind.Full;
  /** 交给 artifact capture 的新输入 */
  artifact: TArtifactInput;
}>;

/** incremental Program 执行的三种可观察结果 */
export type RuntimeUpdateResult<TArtifactInput> =
  | Readonly<{
      /** incremental 执行判别字段 */
      kind: typeof RuntimeProgramKind.Incremental;
      /** 交给 artifact capture 的新输入 */
      artifact: TArtifactInput;
    }>
  | Readonly<{
      /** 复用 committed artifact 的判别字段 */
      kind: typeof RuntimeProgramKind.Bailout;
    }>
  | Readonly<{
      /** 放弃增量路径并执行 full run 的判别字段 */
      kind: typeof RuntimeProgramKind.Fallback;
      /** 随成功 full 结果提交的可选 warnings */
      diagnostics?: ReadonlyArray<RuntimeProgramWarningInput>;
    }>;

/** Program artifact 的 capture、双层 read 与释放契约 */
export type RuntimeProgramArtifactDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead> = Readonly<{
  /** 捕获 session-owned artifact */
  capture: (input: TArtifactInput) => TArtifact;
  /** 产生只供本 Program update 使用的 private read */
  readForProgram: (artifact: TArtifact) => TProgramRead;
  /** 产生依赖 Program 与宿主可见的 public read */
  read: (artifact: TArtifact) => TPublicRead;
  /** 释放未发布或已替换的 artifact */
  dispose?: (artifact: TArtifact) => void;
}>;

/** Program commit observer 接收的 revision-bound 事件 */
export type RuntimeCommitEvent<TPublicRead> =
  | Readonly<{
      /** 初始提交判别字段 */
      phase: typeof RuntimeProgramPhase.Initial;
      /** 初始提交不存在 base revision */
      baseRevision?: never;
      /** 已发布的 session revision */
      revision: RuntimeRevision;
      /** 初始 Program 固定使用 full outcome */
      outcome: typeof RuntimeProgramKind.Full;
      /** 已发布 artifact 的 public Snapshot */
      artifact: RuntimeSnapshot<TPublicRead>;
      /** publish 前冻结的 commit-safe diagnostics */
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>
  | Readonly<{
      /** 更新提交判别字段 */
      phase: typeof RuntimeProgramPhase.Update;
      /** update 基于的 previous revision */
      baseRevision: RuntimeRevision;
      /** 已发布的 next revision */
      revision: RuntimeRevision;
      /** 当前 Program 的实际执行结果 */
      outcome: Exclude<RuntimeProgramKindValue, typeof RuntimeProgramKind.Bailout>;
      /** 已发布 artifact 的 public Snapshot */
      artifact: RuntimeSnapshot<TPublicRead>;
      /** publish 前冻结的 commit-safe diagnostics */
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>;

/** Runtime Program Definition 的作者侧输入 */
export type RuntimeProgramDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead> = Readonly<{
  /** Program 的结构化 identity */
  id: RuntimeProgramId;
  /** Program 声明读取的 owner tokens */
  owners: ReadonlyArray<RuntimeOwnerToken>;
  /** Program 声明读取的 upstream Program tokens */
  programs: ReadonlyArray<RuntimeProgramToken>;
  /** Program callback 允许发出的 trace phases */
  tracePhases: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** Program artifact 生命周期 */
  artifact: RuntimeProgramArtifactDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead>;
  /** full 执行入口 */
  run: (view: RuntimeCandidateView, context: RuntimeProgramContext) => RuntimeRunResult<TArtifactInput>;
  /** 可选 incremental 执行入口 */
  update?: (
    previous: TProgramRead,
    view: RuntimeCandidateView,
    context: RuntimeProgramContext,
  ) => RuntimeUpdateResult<TArtifactInput>;
  /** 成功发布新 artifact 后的隔离 observer */
  observeCommit?: (event: RuntimeCommitEvent<TPublicRead>) => void;
}>;
