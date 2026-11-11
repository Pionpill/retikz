import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type { IdAllocator, PropertyPath } from '@retikz/foundation';

import type { CompileOptions, ExecuteOptions, SceneCompilationSnapshot, SharedCompileContext } from '../../compile';
import type { WeaveNode, WeaveRoot } from '../shared';
import { WeaveEditor } from './editor';
import { WeaveTracker } from './tracker';
import { WeaveTransaction } from './transaction';

/** 完成基础树编译后可提交的完整结果 */
export type WeaveCompilation<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> = {
  /** 保持身份稳定的声明根 */
  root: WeaveRoot;
  /** 可交给输出事务提交的完整快照 */
  compilation: SceneCompilationSnapshot<TComposite>;
  /** 本次实际编译的元素数，不含缓存复用 */
  visited: number;
};

/** 会话期间稳定的编译配置 */
export type WeaveCompileContext = Readonly<{
  /** 与 Core 共用的定义、配置与宿主能力 */
  shared: SharedCompileContext;
  /** 最终 Scene 组装选项 */
  output: Readonly<{ padding?: CompileOptions['padding'] }>;
  /** 调用方注入的执行选项 */
  execution: Readonly<ExecuteOptions>;
}>;

/** 跨批次保留的声明身份与已完成结果 */
type WeavePersistentState<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> = {
  /** 稳定节点与已提交、候选版本槽 */
  readonly root: WeaveRoot;
  /** Scope 身份分配器，回滚不复用编号 */
  readonly scopeIds: IdAllocator;
  /** 名称读取身份与稳定节点的对应关系 */
  readonly bindings: Map<object, WeaveNode>;
  /** 最近完成的声明输入 */
  source: IRScene;
  /** 最近完成发布的编译结果，准备与 commit 不替换 */
  completed?: WeaveCompilation<TComposite>;
};

/** 单个候选批次的隔离计算状态 */
export type WeaveBatchState = {
  /** 当前批次的候选输入 */
  source: IRScene;
  /** 当前批次独占的候选事务 */
  readonly transaction: WeaveTransaction;
  /** 当前批次的声明编辑器 */
  readonly editor: WeaveEditor;
  /** 当前批次的依赖失效追踪器 */
  readonly tracker: WeaveTracker;
  /** 当前批次是否复用已挂载树 */
  readonly updating: boolean;
  /** 当前批次是否强制重新计算 */
  readonly forceFull: boolean;
  /** 操作前的声明路径，路径变化时禁止复用旧位置缓存 */
  readonly previousNodeIrPaths: ReadonlyMap<WeaveNode, PropertyPath>;
  /** 实际执行的元素编译次数 */
  visited: number;
};

/** 会话可变状态，批次关闭后释放临时计算环境 */
export type WeaveCompileState<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> = {
  /** 跨批次的独立事实源 */
  readonly persistent: WeavePersistentState<TComposite>;
  /** 当前候选批次；完成或放弃后为空 */
  batch: WeaveBatchState | undefined;
};

/** 创建独占事务和计算环境，身份与绑定表由持久状态提供 */
export const createWeaveBatchState = (
  persistent: WeavePersistentState,
  updating: boolean,
  forceFull = false,
): WeaveBatchState => {
  const transaction = new WeaveTransaction(persistent.root);
  const editor = new WeaveEditor(persistent.root, transaction, persistent.scopeIds);
  return {
    source: persistent.source,
    transaction,
    editor,
    tracker: new WeaveTracker(persistent.root, transaction, persistent.bindings),
    updating,
    forceFull,
    previousNodeIrPaths: updating ? editor.captureNodeIrPaths() : new Map(),
    visited: 0,
  };
};
