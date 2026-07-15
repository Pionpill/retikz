import type { AxisAlignedBounds } from '@retikz/math';

import type { ScenePrimitive, Transform } from '../../contract';
import type { IRChild, IRPathBase, IRTransform } from '../../schemas';
import type { NamespaceStack } from '../namespace';
import type { NodeLayout } from '../node';
import type { StyleFrame } from '../style';
import type { CompileContext } from './context';
import type { InternalScenePrimitive, PathPlaceholder, PrimitiveZIndexTable } from './primitive';

/** 等待命名引用完成注册后再 emit 的 path 任务。 */
export type PendingPathEmission = {
  /** 已合并样式和动画过滤后的 path IR。 */
  path: IRPathBase;
  /** warning 与诊断使用的 IR locator。 */
  irPath: string;
  /** path 所在 scope 的累计 transform。 */
  scopeChain: ReadonlyArray<Transform>;
  /** path 在所属 primitive sink 中的原位回填槽。 */
  placeholderSlot: { primitiveSink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
  /** 编译期排序用 zIndex，不写入 Scene primitive。 */
  zIndex?: number;
};

/** child 遍历编译后的 primitive 与自动 layout bbox。 */
export type TraversalResult = {
  /** 已完成排序和占位回填的 Scene primitive。 */
  primitives: Array<ScenePrimitive>;
  /** 自动 layout 使用的全局 bbox。 */
  layoutBounds: AxisAlignedBounds | undefined;
};

/** 整棵 child 树遍历期间共享的可变状态。 */
export type TraversalState = {
  /** 顶层 primitive 输出容器，path 占位会在返回前回填。 */
  primitives: Array<InternalScenePrimitive>;
  /** 自动 layout 使用的全局 bbox。 */
  layoutBounds: AxisAlignedBounds | undefined;
  /** id 注册与查找栈。 */
  namespaceStack: NamespaceStack;
  /** primitive 的编译期 zIndex 旁路表。 */
  zIndexOf: PrimitiveZIndexTable;
  /** 尚未回填的 path 占位数量。 */
  placeholderBalance: number;
};

/** child 遍历期间使用的 compile 依赖。 */
export type TraversalContext = Pick<
  CompileContext,
  | 'measureText'
  | 'lowerTex'
  | 'onWarn'
  | 'onNodeLayout'
  | 'round'
  | 'nodeDistance'
  | 'labelDistance'
  | 'rootFontSize'
  | 'shapes'
  | 'boundaries'
  | 'arrows'
  | 'pathGenerators'
  | 'pathKinds'
  | 'ribbonWidthProfiles'
  | 'paint'
  | 'clip'
>;

/** child 遍历期间共享的运行时对象。 */
export type TraversalRuntime = {
  /** 遍历可变状态。 */
  state: TraversalState;
  /** compile 只读依赖。 */
  context: TraversalContext;
};

/** 递归处理一层 child 时的上下文。 */
export type TraversalFrame = {
  /** 当前 scope 累计 transform。 */
  scopeChain: ReadonlyArray<Transform>;
  /** 当前层 primitive 输出容器。 */
  primitiveSink: Array<InternalScenePrimitive>;
  /** 当前层 IR locator 前缀。 */
  locatorPrefix: string;
  /** 向父 scope 汇报 bbox 输入 layout。 */
  layoutSink: Array<NodeLayout>;
  /** 当前层延迟 emit 的 path 任务。 */
  pathSink: Array<PendingPathEmission>;
  /** 当前层样式继承栈。 */
  styleStack: ReadonlyArray<StyleFrame>;
};

export type NodeChild = Extract<IRChild, { type: 'node' }>;
export type CoordinateChild = Extract<IRChild, { type: 'coordinate' }>;
export type ScopeChild = Extract<IRChild, { type: 'scope' }>;
export type PathChild = Extract<IRChild, { type: 'path' | 'ribbon' }>;

/** scope transforms 解析结果。 */
export type ScopeTransformResolution = {
  /** 当前 scope 自身的 Scene transforms。 */
  scopeTransforms: ReadonlyArray<Transform>;
  /** 子树使用的累计 scopeChain。 */
  childScopeChain: ReadonlyArray<Transform>;
};

/** scope.id layout 占位注册结果。 */
export type ScopeLayoutPlaceholder = {
  /** scope.id 所在父 namespace frame 深度。 */
  parentFrameDepth: number;
  /** scope.id 初始占位 layout；无 id 时不存在。 */
  placeholderLayout?: NodeLayout;
};

export type ScopeLayoutPlaceholderContext = {
  index: number;
  childScopeChain: ReadonlyArray<Transform>;
  frame: TraversalFrame;
};

export type RegisterResolvedScopeLayoutContext = {
  childScopeChain: ReadonlyArray<Transform>;
  scopeLayouts: ReadonlyArray<NodeLayout>;
  layoutPlaceholder: ScopeLayoutPlaceholder;
  frame: TraversalFrame;
};

export type EmitScopeGroupContext = {
  index: number;
  scopeTransforms: ReadonlyArray<Transform>;
  scopePrimitiveSink: Array<InternalScenePrimitive>;
  frame: TraversalFrame;
};

export type FailedScopeTransform = IRTransform | undefined;
