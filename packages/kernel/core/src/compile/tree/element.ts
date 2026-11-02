import { formatPropertyPath } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { resolveNodeBoundary } from '../../resolve';
import type { ElementCompileOptions, ElementCompileResult } from '../context';
import { createWorkspaceCompileContext } from '../context';
import { composeScopeTransform, orderCompileWarnings, withCompileWarningOccurrence } from '../shared';
import { createPositionResolveContext } from './reference';

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
