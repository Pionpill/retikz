import { formatPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { DEFAULT_RESOLVED_THEME, resolveScopeDefaults, resolveTheme } from '../../resolve';
import { resolveNodeBoundary } from '../../resolve';
import type { IRScope } from '../../schemas';
import type { SharedCompileContext } from '../context';
import { createWorkspaceCompileContext } from '../context';
import { orderCompileWarnings, withCompileWarningOccurrence } from '../orchestration';
import { createPositionResolveContext } from '../orchestration';
import { composeScopeTransform } from '../transform';
import type { ElementCompileContext, ElementCompileOptions, ElementCompileResult } from './types';

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
  const pending = new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Element dependency is pending');
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
      if (entry.state === 'pending') throw pending;
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
    pending,
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
    if (error === workspace.pending) {
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
