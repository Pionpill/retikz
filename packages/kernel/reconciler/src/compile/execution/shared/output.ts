import type {
  CanonicalScope,
  LayoutProposal,
  LayoutChildResult,
  Transform,
  IRChild,
  CompileOccurrenceLocator,
  CompileWarning,
  CompiledCoordinate,
  CompiledNode,
  CompiledScope,
  CompiledPath,
  IRCoordinate,
  IRNode,
  IRScope,
  ScenePrimitive,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { CompositeReplayTransaction, CompileRuntime } from '../../runtime';
import type { PendingPathEmission } from '../leaf';
import type { ScopeExecutionSteps } from '../scope';
import type { SubtreeCompileContext, SubtreeCompileRuntime } from '../subtree';
import type { PATH_PLACEHOLDER } from './constants';

/** 编译期图元数组的元素：Scene primitive 或路径占位项 */
export type InternalScenePrimitive = ScenePrimitive | { type: typeof PATH_PLACEHOLDER };

/** zIndex 只作为编译期旁路信息，不写入 Scene primitive */
type PrimitiveZIndexMap = WeakMap<ScenePrimitive, number>;

/** 无名称读写、诊断、运行时输入或嵌套组件的试算贡献；不含回调句柄或可变工作区 */
export type RetainedProbeOutput = {
  child: IRChild;
  proposal: LayoutProposal;
  chain: ReadonlyArray<Transform>;
  targetChain: ReadonlyArray<Transform>;
  /** 重放时只需重新放置已有局部产物 */
  localPlacement: boolean;
  layout: Omit<LayoutChildResult, 'replay'>;
  contribution: Omit<CompositeReplayTransaction, 'owner' | 'originOccurrence' | 'used' | 'materialize'>;
};

/** 增量驱动按生成位置选择基础阶段；遍历器仍负责发布、命名与排序 */
export type CompositeElementDispatcher = {
  /** 在已闭合的局部坐标系中复用绘制与名称发布，未命中时按原顺序求值 */
  block?: (
    runtime: CompileRuntime,
    output: TreeOutputState,
    frame: SubtreeCompileRuntime,
    occurrence: CompileOccurrenceLocator,
    input: ReadonlyArray<unknown>,
    layouts: ReadonlyArray<object>,
    compile: (frame: SubtreeCompileRuntime) => void,
  ) => void;
  /** 在变换后的环境重新物化试算结果，不覆盖原始试算阶段 */
  probe: (
    occurrence: CompileOccurrenceLocator,
    replay: boolean,
  ) => {
    current?: RetainedProbeOutput;
    begin: () => CompositeElementDispatcher;
    store: (output: RetainedProbeOutput) => void;
  };
  node: (
    runtime: CompileRuntime,
    occurrence: CompileOccurrenceLocator,
    ir: IRNode,
    path: PropertyPath,
    frame: SubtreeCompileContext,
  ) => CompiledNode;
  coordinate: (
    runtime: CompileRuntime,
    occurrence: CompileOccurrenceLocator,
    ir: IRCoordinate,
    frame: SubtreeCompileContext,
  ) => CompiledCoordinate;
  path: (runtime: CompileRuntime, pending: PendingPathEmission) => CompiledPath;
  resolveScope: (
    runtime: CompileRuntime,
    occurrence: CompileOccurrenceLocator,
    ir: IRScope,
    path: PropertyPath,
    frame: SubtreeCompileContext,
    themePath: string,
  ) => CanonicalScope;
  compileScope: (
    runtime: CompileRuntime,
    occurrence: CompileOccurrenceLocator,
    ir: IRScope,
    frame: SubtreeCompileContext,
    steps: ScopeExecutionSteps,
    diagnostics: ReadonlyArray<CompileWarning>,
  ) => CompiledScope;
};

/** 当前子树输出的排序记录与尚未回填的路径数 */
export type TreeOutputState = {
  /** 本次执行的图元排序旁路表 */
  zIndexMap: PrimitiveZIndexMap;
  /** 本次执行尚未回填的占位数量 */
  pendingPathCount: number;
  /** 仅增量作者实例及其试算子树携带 */
  compositeDispatcher?: CompositeElementDispatcher;
};
