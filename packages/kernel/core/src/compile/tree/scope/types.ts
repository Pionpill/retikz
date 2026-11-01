import type { PropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator, GroupPrimitive, Transform, SceneClipPath } from '../../../contract';
import type { PositionTargetResolveContext } from '../../../resolve/position';
import type { IRChild, IRPosition, IRScope } from '../../../schemas';
import type { ElementCompileContext } from '../../context';
import type { CompileOutput } from '../../output';
import type { CompileOwnerKey } from '../../provenance';
import type { CompileWarning } from '../../warning';
import type { TreeCompileFrame } from '../frame';
import type { CompiledNodeLayout } from '../node';
import type { InternalScenePrimitive } from '../output';

/** Scope 子元素计算前的准备状态，不代表包络已就绪 */
export type ScopeCompilationPreparation = Readonly<{
  /** 子元素有效继承上下文 */
  scope: ElementCompileContext;
  /** 已在父坐标系解析的放置目标 */
  positionTarget?: IRPosition;
  /** 不依赖包络时可提前使用的自身变换 */
  preliminaryTransforms?: Array<Transform>;
}>;

/** Scope 编译状态，仅持有自身包络、输出与组装属性 */
export type CompiledScope = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: PropertyPath;
  /** 局部内容包络，包含空内容时的既有退化布局 */
  envelope: CompiledNodeLayout;
  /** Scope 输出的包装属性，不包含 children */
  group: Omit<GroupPrimitive, 'children'>;
  /** 自身装饰及其资源，不重复持有子输出 */
  output: CompileOutput;
}>;

/** Scope 自身几何声明，不包含子树 */
export type InputScopeCompile = Omit<IRScope, 'children'>;

/** Scope 单次几何计算环境 */
export type ScopeGeometryContext = Readonly<{
  /** 当前位置读取能力 */
  positionContext: PositionTargetResolveContext;
  /** 当前诊断位置 */
  irPath: PropertyPath;
  /** 当前诊断接收器 */
  onWarn: (warning: CompileWarning) => void;
}>;

/** scope.id layout 占位注册结果 */
export type ScopeLayoutPlaceholder = {
  /** scope.id 所在父 namespace frame 深度 */
  parentFrameDepth: number;
  /** scope.id 初始占位 layout；无 id 时不存在 */
  placeholderLayout?: CompiledNodeLayout;
};

/** 创建 Scope 布局占位项所需的遍历位置与父帧 */
export type ScopeLayoutPlaceholderContext = {
  /** 当前作用域在父层子项中的索引 */
  index: number;
  /** 登记占位布局所使用的父遍历帧 */
  frame: TreeCompileFrame;
};

/** 将已编译的 Scope 子树封装为场景分组所需的坐标、裁剪与身份上下文 */
export type EmitScopeGroupContext = {
  /** 当前作用域在父层子项中的索引 */
  index: number;
  /** 施加于该作用域场景分组的变换链 */
  scopeTransforms: ReadonlyArray<Transform>;
  /** 已收集的作用域子图元及待回填占位项 */
  scopePrimitiveSink: Array<InternalScenePrimitive>;
  /** 接收作用域输出和布局贡献的父遍历帧 */
  frame: TreeCompileFrame;
  /** runtime Scope 预检阶段已生成且尚未登记的裁剪路径 */
  resolvedClipPath?: SceneClipPath;
  /** Scope child 的 semantic owner */
  semanticOwner?: CompileOwnerKey;
};

/** Scope 后代递归所需的窄调度入口 */
export type ScopeVisitHost = {
  /** 按当前帧遍历后代，来源和深度沿用当前编译 */
  compileChildren: (
    children: ReadonlyArray<IRChild>,
    frame: TreeCompileFrame,
    useProvidedOccurrence: boolean,
    occurrence: CompileOccurrenceLocator | undefined,
    compositeDepth: number,
  ) => void;
};
