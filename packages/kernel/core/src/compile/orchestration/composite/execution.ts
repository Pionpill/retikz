import type { CompositeBoundChild, CompositeCompileChild, CompositeReplay, SceneClipPath } from '../../../contract';
import type { createScopeTransformContext } from '../../transform';
import type { CompileTraversal } from '../traversal';
import type { TraversalRuntime } from '../types';
import type { CompositeReplayTransaction, CompositeRuntimeOutputChild } from './types';

/** 完成预检的重放事务及外层裁剪 */
export type PreparedReplay = Readonly<{
  /** 选中的隔离试编译贡献 */
  transaction: CompositeReplayTransaction;
  /** 预检阶段解析的包装裁剪 */
  wrapperClipPath?: SceneClipPath;
}>;

/** 完成归属检查的组件输出子项 */
export type PreparedRuntimeOutput = Readonly<{
  /** 绑定输入、重放或生成 Scope */
  output: CompositeRuntimeOutputChild;
  /** 生成 Scope 预先解析的裁剪 */
  scopeClipPath?: SceneClipPath;
}>;

/** 预检成功后供输出提交使用的句柄索引 */
export type PreparedCompositeOutputs = Readonly<{
  /** 输出句柄对应的完整子项 */
  outputs: ReadonlyMap<object, PreparedRuntimeOutput>;
  /** 重放凭证对应的事务 */
  replays: ReadonlyMap<CompositeReplay, PreparedReplay>;
}>;
/** Composite 执行所需的遍历操作，不持有遍历器的私有状态 */
export type CompositeCompileHost = Pick<
  CompileTraversal,
  'withWarningOccurrence' | 'compileChild' | 'compileScopeChild' | 'resolveExplicitBoundary'
>;
/** 重放与输出提交的显式依赖 */
export type CompositeExecutionContext = {
  /** 当前编译的工作区与名称环境 */
  runtime: TraversalRuntime;
  /** 本次遍历的变换计算缓存 */
  scopeTransformsContext: ReturnType<typeof createScopeTransformContext>;
  /** 递归与诊断调度能力 */
  host: CompositeCompileHost;
};
/** 只按本次会话登记的对象身份识别组件输出句柄 */
export const isCompositeOutputHandle = (
  runtime: TraversalRuntime,
  output: unknown,
): output is CompositeCompileChild | CompositeBoundChild =>
  output !== null && typeof output === 'object' && runtime.context.session.outputChildren.has(output);
