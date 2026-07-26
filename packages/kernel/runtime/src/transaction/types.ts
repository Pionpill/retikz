import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeOwnerToken, RuntimeRevision } from '../owner';

declare const RuntimeOwnerCommandBrand: unique symbol;

/** 初始 Snapshot 的 opaque owner command */
export type RuntimeOwnerInput = Readonly<{
  /** command 关联的 owner token */
  owner: RuntimeOwnerToken;
  /** 初始输入判别字段 */
  kind: 'initial';
  /** 只允许 Runtime builder 构造 command */
  [RuntimeOwnerCommandBrand]: true;
}>;

/** 更新 Snapshot 的 opaque owner command */
export type RuntimeOwnerUpdate = Readonly<{
  /** command 关联的 owner token */
  owner: RuntimeOwnerToken;
  /** 更新输入判别字段 */
  kind: 'update';
  /** 只允许 Runtime builder 构造 command */
  [RuntimeOwnerCommandBrand]: true;
}>;

/** 绑定所属 session revision 的 immutable read envelope */
export type RuntimeSnapshot<TRead> = Readonly<{
  /** 当前 view 所属的 session revision */
  revision: RuntimeRevision;
  /** owner 或 Program 暴露的 immutable read view */
  value: TRead;
}>;

/** 一次同步 session update 的完整输入 */
export type RuntimeSessionUpdate = Readonly<{
  /** update 基于的 current revision */
  baseRevision: RuntimeRevision;
  /** 本次提供完整 next Snapshot 的 owner commands */
  owners: ReadonlyArray<RuntimeOwnerUpdate>;
}>;

/** 一次同步 session update 的公开结果 */
export type RuntimeSessionResult = Readonly<{
  /** 成功发布后的 session revision */
  revision: RuntimeRevision;
  /** 本次 transaction 的聚合执行结果 */
  outcome: 'committed' | 'full' | 'incremental' | 'fallback' | 'bailout';
  /** 本次调用产生的 immutable diagnostics */
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}>;
