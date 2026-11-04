import type { CompileOccurrenceLocator, IRChild } from '@retikz/core';

import type { CompileOwnerKey } from '../../provenance';
import type { SubtreeCompileRuntime } from '../runtime';
import type { InternalScenePrimitive } from '../shared';

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
