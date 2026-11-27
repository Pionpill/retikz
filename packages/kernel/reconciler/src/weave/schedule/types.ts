import type { CompileWarning, IRScene } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type {
  CompileElementExecutor,
  CompileOwnerKey,
  CompileRuntime,
  NamespaceFrameChange,
  ScopeExecutionSteps,
  SubtreeCompileRuntime,
  SubtreeCompileState,
} from '../../compile';
import type { executeWeaveScope } from '../element';
import type { WeaveContribution, WeaveEntry, WeaveReferenceRead, WeaveRoot } from '../shared';
import type { WeaveNameIndex, WeaveTransaction } from '../state';

/** 父容器读取的子输出，来自本批子树或已发布的只读贡献 */
export type WeaveAssembledOutput = SubtreeCompileState | WeaveContribution['output'];

/** 候选直接变化与完成确认；依赖在读取点核对实际结果 */
export type WeaveUpdateRequest = {
  /** 自身输入未变时可以核对的旧贡献 */
  check?: WeaveContribution;
  /** 本批声明变化 */
  inputs: NonNullable<WeaveEntry['pending']>['pendingInputs'];
  /** 完成后清除输入通知 */
  consume: () => void;
};

/** 仅在本批存在的独立执行环境，不从作者子树遍历捕获 */
export type WeaveElementExecution = {
  runtime: CompileRuntime;
  executor: CompileElementExecutor;
  frame: SubtreeCompileRuntime;
  bindings: ReadonlyArray<NamespaceFrameChange>;
  /** Composite 准备和延迟路径的实际读取 */
  reads?: Array<WeaveReferenceRead>;
  /** 准备读取已证实有效，可供延迟输出的反向依赖读取 */
  bindingsReady?: boolean;
  /** 只确认准备读取的 Composite 旧结果，输出读取在输出边界核对 */
  retained?: WeaveContribution;
  scope?: ScopeExecutionSteps;
  /** 包络已就绪但尚未与最终输出一起提交的 Scope 结果 */
  scopeResult?: ReturnType<typeof executeWeaveScope>;
  /** 后代计算前的确定化与准备诊断 */
  scopeDiagnostics?: ReadonlyArray<CompileWarning>;
  /** Scope 准备阶段消费的引用，只保存在 Weave 候选中 */
  scopeReads?: Array<WeaveReferenceRead>;
  /** 当前基础元素输出的来源归属 */
  semanticOwner?: CompileOwnerKey;
};

/** 一个候选批次的执行能力与条目事实 */
export type WeaveExecutionContext = {
  /** 结构、名称或命名空间已变动，旧声明与输出地址不可复用 */
  indexesChanged: boolean;
  /** 本批作者输入 */
  source: IRScene;
  /** 本次独占计算环境 */
  runtime: CompileRuntime;
  /** 记录基础元素阶段结果 */
  recordComputed: <TEntry extends Exclude<WeaveEntry, { type: 'composite' }>>(
    entry: TEntry,
    metadata: NoInfer<NonNullable<NonNullable<TEntry['current']>['compile']>>,
    reused: boolean,
    referenceReads: ReadonlyArray<WeaveReferenceRead>,
  ) => void;
  /** 保存已完成作者输出 */
  writeContribution: (
    entry: WeaveEntry,
    contribution: WeaveContribution,
    referenceReads: ReadonlyArray<WeaveReferenceRead>,
  ) => void;
  /** 当前声明根 */
  root: WeaveRoot;
  /** 候选状态事务 */
  transaction: WeaveTransaction;
  /** 条目到当前声明位置的索引 */
  paths: ReadonlyMap<WeaveEntry, PropertyPath>;
  /** 声明可见性索引 */
  names: WeaveNameIndex;
};

/** 当前驱动选择的复用资格与待计算声明 */
export type WeaveExecutionSelection = {
  /** 判断该条目是否允许使用旧阶段产物 */
  canReuse: (entry: WeaveEntry) => boolean;
  /** 驱动选定的清洁贡献 */
  retained: ReadonlyMap<WeaveEntry, WeaveContribution>;
  /** 待计算或待验证的声明 */
  pending: Map<WeaveEntry, WeaveUpdateRequest>;
};
