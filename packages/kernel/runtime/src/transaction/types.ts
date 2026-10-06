import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeSourceToken, RuntimeRevision } from '../source';

declare const RuntimeSourceCommandBrand: unique symbol;

/** 初始 Snapshot 的 opaque source command */
export type RuntimeSourceInput = Readonly<{
  /** command 关联的 source token */
  source: RuntimeSourceToken;
  /** 初始输入判别字段 */
  kind: 'initial';
  /** 只允许 Runtime builder 构造 command */
  [RuntimeSourceCommandBrand]: true;
}>;

/** 更新 Snapshot 的 opaque source command */
export type RuntimeSourceUpdate = Readonly<{
  /** command 关联的 source token */
  source: RuntimeSourceToken;
  /** 更新输入判别字段 */
  kind: 'update';
  /** 只允许 Runtime builder 构造 command */
  [RuntimeSourceCommandBrand]: true;
}>;

/**
 * 绑定所属 runtime revision 的 immutable read envelope
 * @template TRead 快照中 value 承载的 Source 或计算结果只读视图类型
 */
export type RuntimeSnapshot<TRead> = Readonly<{
  /** 当前 view 所属的 runtime revision */
  revision: RuntimeRevision;
  /** source 或 Computation 暴露的 immutable read view */
  value: TRead;
}>;

/** 一次同步 runtime update 的完整输入 */
export type RuntimeUpdate = Readonly<{
  /** update 基于的 current revision */
  baseRevision: RuntimeRevision;
  /** 本次提供完整 next Snapshot 的 source commands */
  sources: ReadonlyArray<RuntimeSourceUpdate>;
}>;

/** 一次同步 runtime update 的公开结果 */
export type RuntimeResult = Readonly<{
  /** 成功发布后的 runtime revision */
  revision: RuntimeRevision;
  /** 本次 transaction 的聚合执行结果 */
  outcome: 'committed' | 'full' | 'incremental' | 'fallback' | 'bailout';
  /** 本次调用产生的 immutable diagnostics */
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}>;
