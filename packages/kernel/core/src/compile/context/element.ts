import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator, LayoutProposal, Transform } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { MergedScopeDefaults } from '../../resolve';
import { DEFAULT_RESOLVED_THEME, resolveNodeBoundary, resolveScopeDefaults, resolveTheme } from '../../resolve';
import type { IRScope } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import { orderCompileWarnings, withCompileWarningOccurrence } from '../diagnostics';
import type { CompiledNodeLayout } from '../node';
import { createPositionResolveContext } from '../reference';
import { composeScopeTransform } from '../transform';
import type { CompileWarning } from '../warning';
import type { SharedCompileContext } from './shared';
import { createWorkspaceCompileContext } from './workspace';

/** 解析 Scope 子元素继承上下文；不编译 children 或聚合几何 */
export const resolveScopeContext = (
  scope: Pick<IRScope, 'defaults' | 'theme'>,
  shared: SharedCompileContext,
  parent?: ElementCompileContext,
  irPath: PropertyPath = [],
): ElementCompileContext =>
  Object.freeze({
    defaults: resolveScopeDefaults(scope, parent?.defaults),
    theme: resolveTheme(
      parent?.theme ?? DEFAULT_RESOLVED_THEME,
      scope.theme,
      formatPropertyPath([...irPath, 'theme']),
      shared.registries.themeRegistry,
    ),
  });

/** 创建独占的资源、诊断与引用读取工作区 */
const createElementWorkspace = (options: ElementCompileOptions) => {
  const workspace = createWorkspaceCompileContext(options.shared);
  let pending: RetikzCoreError | undefined;
  const scopeChain = options.transforms ?? [];
  const composedTransform = composeScopeTransform(scopeChain);
  const positionContext = createPositionResolveContext({
    nodeDistance: options.shared.layout.nodeDistance,
    scopeChain,
    composedTransform,
    nodeBoundaryContext: workspace.nodeBoundaryContext,
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
        pending ??= new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Element dependency is pending');
        throw pending;
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
    ...workspace,
    get pending() {
      return pending;
    },
    scopeChain,
    composedTransform,
    positionContext,
  };
};

/** 单次计算工作区，仅在本次调用中使用 */
type ElementCompileWorkspace = ReturnType<typeof createElementWorkspace>;

/** 运行一次单元素计算，将依赖等待与真实编译错误分开 */
export const runElementCompilation = <TCompiled>(
  options: ElementCompileOptions,
  compute: (workspace: ElementCompileWorkspace) => TCompiled,
): ElementCompileResult<TCompiled> => {
  const workspace = createElementWorkspace(options);
  try {
    const compiled = compute(workspace);
    workspace.paintRegistry.validateReferences(workspace.clipRegistry.resources());
    return Object.freeze({
      status: 'compiled',
      compiled,
      diagnostics: Object.freeze(
        orderCompileWarnings(
          workspace.diagnostics.warnings.map(warning => withCompileWarningOccurrence(warning, options.occurrence)),
        ),
      ),
    });
  } catch (error) {
    if (workspace.pending !== undefined && error === workspace.pending) {
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

/** 元素接收到的有效样式与主题，不包含资源工作区 */
export type ElementCompileContext = Readonly<{
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
  /** 父级有效上下文 */
  context: ElementCompileContext;
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

/** 完成与未就绪明确区分；未就绪不携带半成品或诊断 */
export type ElementCompileResult<TCompiled> =
  | Readonly<{
      status: 'compiled';
      compiled: TCompiled;
      diagnostics: ReadonlyArray<CompileWarning>;
    }>
  | Readonly<{ status: 'pending' }>;
