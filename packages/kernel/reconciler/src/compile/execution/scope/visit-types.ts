import type {
  CanonicalScope,
  ScopeCompileContext,
  CompiledScope,
  CompileOccurrenceLocator,
  IRChild,
  Transform,
  prepareScopePlacement,
} from '@retikz/core';

import type { CompileOwnerKey } from '../../provenance';
import type { InternalScenePrimitive } from '../shared';
import type { SubtreeCompileRuntime } from '../subtree';

/** scope.id layout 占位注册结果 */
export type ScopeLayoutPlaceholder = {
  /** scope.id 所在父 namespace frame 深度 */
  parentFrameDepth: number;
};

/** 创建 Scope 布局占位项所需的遍历位置与父帧 */
export type ScopeLayoutPlaceholderContext = {
  /** 本次 Scope 实例的内部身份 */
  scopeId: string;
  /** 当前作用域在父层子项中的索引 */
  index: number;
  /** 登记占位布局所使用的父遍历帧 */
  frame: SubtreeCompileRuntime;
};

/** 将已编译的 Scope 子树封装为场景分组所需的坐标、裁剪与身份上下文 */
export type EmitScopeGroupContext = {
  /** 已收集的作用域子图元及待回填占位项 */
  scopePrimitives: Array<InternalScenePrimitive>;
  /** 接收作用域输出和布局贡献的父遍历帧 */
  frame: SubtreeCompileRuntime;
  /** Scope child 的 semantic owner */
  semanticOwner?: CompileOwnerKey;
};

/** Scope 后代递归所需的窄调度入口 */
export type ScopeVisitHost = {
  /** 按当前帧遍历后代，来源和深度沿用当前编译 */
  compileChildren: (
    children: ReadonlyArray<IRChild>,
    frame: SubtreeCompileRuntime,
    /** 是否处于本次子树编译的根层，不一定是 Scene 根层 */
    isRoot: boolean,
    occurrence: CompileOccurrenceLocator | undefined,
    compositeDepth: number,
  ) => void;
};

/** Scope 准备后的候选操作；依赖与推进顺序由驱动持有 */
export type ScopeExecutionSteps = {
  /** 本次准备直接产出的子级输入与收集容器，不依赖后代遍历 */
  childFrame: SubtreeCompileRuntime;
  /** 包络计算完成后的当前变换 */
  readonly transforms: ReadonlyArray<Transform>;
  /** 包络阶段完成后的 Core 产物 */
  readonly compiled: CompiledScope;
  /** Core 的放置准备结果 */
  preparation: ReturnType<typeof prepareScopePlacement>;
  /** 在已准备的继承与局部变换下构建子布局 */
  children: () => void;
  /** 子级继承前已确定的自身配置 */
  canon: CanonicalScope;
  /** 子布局就绪后供 Core 计算包络的上下文 */
  readonly compileContext: ScopeCompileContext;
  /** 发布最终包络并投影后代几何 */
  project: (compiled: CompiledScope) => void;
  /** 计算当前名称环境中的路径与输出分配 */
  paths: () => void;
  /** 绑定动画并组装最终输出 */
  publish: () => void;
  /** 无论成功或失败都释放本次作用域栈 */
  dispose: () => void;
};
