import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator, LayoutProposal, Transform } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { MergedScopeDefaults } from '../../../resolve';
import { resolveNodeBoundary } from '../../../resolve';
import type { PositionTargetResolveContext } from '../../../resolve/position';
import type { CanonicalTheme } from '../../../shared';
import type { CompiledNodeLayout } from '../../layout';
import type { SharedCompileContext, WorkspaceCompileState } from '../../runtime';
import { createWorkspaceCompileState } from '../../runtime';
import type { CompileWarning, ComposedScopeTransform } from '../../shared';
import { composeScopeTransform, orderCompileWarnings, withCompileWarningOccurrence } from '../../shared';
import { createPositionResolveContext } from '../reference';

/** 编译时生效的样式默认配置与主题 */
export type CompileStyle = Readonly<{
  /** 按 Core 继承规则解析的默认配置 */
  defaults: MergedScopeDefaults;
  /** 有效主题 */
  theme: CanonicalTheme;
}>;

/** 单次引用查询结果；不携带调用方的名称 frame 或节点身份 */
export type ElementCompileReference =
  | Readonly<{ state: 'pending' }>
  | Readonly<{ state: 'ancestor' }>
  | Readonly<{
      state: 'ready';
      /** 被引用元素的来源路径 */
      irPath?: PropertyPath;
      layout: CompiledNodeLayout;
    }>;

/** 单元素调用共享的显式输入，不拥有调度器 */
export type ElementCompileOptions = Readonly<{
  /** 稳定编译配置、能力定义与服务 */
  shared: SharedCompileContext;
  /** 从父级继承的有效样式配置 */
  style: CompileStyle;
  /** 诊断位置，不作为元素身份 */
  irPath: PropertyPath;
  /** 查询声明位置可见的引用；缺失返回 undefined，读取追踪由调用方负责 */
  lookupReference?: (name: string) => ElementCompileReference | undefined;
  /** 已就绪的父变换 */
  transforms?: ReadonlyArray<Transform>;
  /** 布局分配约束 */
  proposal?: LayoutProposal;
  /** 存在 Composite 展开时的完整出现位置 */
  occurrence?: CompileOccurrenceLocator;
}>;

/** 单元素计算的固定变换与引用解析环境 */
type ElementCompileContext = Readonly<{
  /** 从父级继承的累计变换 */
  transformChain: ReadonlyArray<Transform>;
  /** 累计变换的合成结果 */
  composedTransform: ComposedScopeTransform;
  /** 当前元素的位置与目标引用解析环境 */
  positionContext: PositionTargetResolveContext;
}>;

/** 单元素计算过程中维护的工作区与依赖等待状态 */
type ElementCompileState = {
  /** 本次计算独占的资源、缓存与诊断收集器 */
  readonly workspace: WorkspaceCompileState;
  /** 本次计算遇到的依赖等待错误，用于区分未就绪与真实失败 */
  pending: RetikzCoreError | undefined;
};

/** 单元素计算的上下文与状态，仅在本次调用中使用 */
type ElementCompileRuntime = Readonly<{
  /** 固定的变换与引用解析环境 */
  context: ElementCompileContext;
  /** 本次计算的可变状态 */
  state: ElementCompileState;
}>;

/** 完成与未就绪明确区分；未就绪不携带半成品或诊断 */
export type ElementCompileResult<TCompiled> =
  | Readonly<{
      status: 'compiled';
      compiled: TCompiled;
      diagnostics: ReadonlyArray<CompileWarning>;
    }>
  | Readonly<{ status: 'pending' }>;

/** 创建单元素计算的固定环境与独占状态 */
const createElementCompileRuntime = (options: ElementCompileOptions): ElementCompileRuntime => {
  const state: ElementCompileState = {
    workspace: createWorkspaceCompileState(options.shared),
    pending: undefined,
  };
  const transformChain = options.transforms ?? [];
  const composedTransform = composeScopeTransform(transformChain);
  const positionContext = createPositionResolveContext({
    nodeDistance: options.shared.layout.nodeDistance,
    transformChain,
    composedTransform,
    nodeBoundaryStore: state.workspace.nodeBoundaryStore,
    lookupReference: name => {
      const entry = options.lookupReference?.(name);
      if (entry === undefined) return undefined;
      if (entry.state === 'ancestor') {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Geometry reference cannot target ancestor Scope '${name}'`,
        );
      }
      if (entry.state === 'pending') {
        state.pending ??= new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Element dependency is pending');
        throw state.pending;
      }
      return { layout: entry.layout, irPath: entry.irPath, state: 'resolved' };
    },
    resolveExplicitBoundary: (boundary, reference) =>
      resolveNodeBoundary(boundary, {
        visualDef: reference.visualDef,
        visualParams: reference.visualParams,
        shapeRegistry: options.shared.registries.shapeRegistry,
        boundaryRegistry: options.shared.registries.boundaryRegistry,
        irPath: reference.irPath,
      }),
  });
  return {
    context: { transformChain, composedTransform, positionContext },
    state,
  };
};

/** 运行一次单元素计算，将依赖等待与真实编译错误分开 */
export const runElementCompilation = <TCompiled>(
  options: ElementCompileOptions,
  compute: (runtime: ElementCompileRuntime) => TCompiled,
): ElementCompileResult<TCompiled> => {
  const runtime = createElementCompileRuntime(options);
  try {
    const compiled = compute(runtime);
    return Object.freeze({
      status: 'compiled',
      compiled,
      diagnostics: Object.freeze(
        orderCompileWarnings(
          runtime.state.workspace.diagnosticCollector.warnings.map(warning =>
            withCompileWarningOccurrence(warning, options.occurrence),
          ),
        ),
      ),
    });
  } catch (error) {
    if (runtime.state.pending !== undefined && error === runtime.state.pending) {
      return Object.freeze({ status: 'pending' });
    }
    if (error instanceof RetikzCoreError) throw error;
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Element compilation failed at ${formatPropertyPath(options.irPath)}`,
      {
        cause: error,
      },
    );
  }
};
