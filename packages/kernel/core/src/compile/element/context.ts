import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { DEFAULT_RESOLVED_THEME, resolveScopeDefaults, resolveTheme } from '../../resolve';
import { resolveBoundaryReference } from '../../resolve';
import type { IRScope } from '../../schemas';
import type { CompileEnvironment } from '../environment';
import { createNodeGeometryContext } from '../node';
import { orderCompileWarnings, withCompileWarningOccurrence } from '../orchestration';
import { createPositionResolveContext } from '../orchestration';
import { createClipRegistry, createPaintRegistry } from '../resource';
import { createTextMeasurement } from '../text';
import { composeScopeTransform } from '../transform';
import type { InputCompileWarning } from '../warning';
import type { CompileRead, ElementCompileContext, ElementCompileOptions, ElementCompileResult } from './types';

/** 解析 Scope 子元素继承上下文；不编译 children 或聚合几何 */
export const resolveScopeContext = (
  scope: Pick<IRScope, 'defaults' | 'theme'>,
  environment: CompileEnvironment,
  parent?: ElementCompileContext,
  irPath = 'scene',
): ElementCompileContext =>
  Object.freeze({
    defaults: resolveScopeDefaults(scope, parent?.defaults),
    theme: resolveTheme(
      parent?.theme ?? DEFAULT_RESOLVED_THEME,
      scope.theme,
      `${irPath}.theme`,
      environment.themeDefinitions,
    ),
  });

/** 创建独占的资源、诊断与引用读取工作区 */
const createElementWorkspace = (options: ElementCompileOptions) => {
  const diagnostics: Array<InputCompileWarning> = [];
  const reads: Array<CompileRead> = [];
  const pending = new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Element dependency is pending');
  const nodeGeometry = createNodeGeometryContext();
  const scopeChain = options.transforms ?? [];
  const composedTransform = composeScopeTransform(scopeChain);
  const paint = createPaintRegistry(options.environment.round);
  const clip = createClipRegistry(options.environment.round, options.environment.maxClipDepth);
  const onWarn = (warning: InputCompileWarning): void => {
    diagnostics.push(warning);
  };
  const positionContext = createPositionResolveContext({
    nodeDistance: options.environment.nodeDistance,
    scopeChain,
    composedTransform,
    geometryContext: nodeGeometry,
    lookupReference: name => {
      for (let namespace = options.namespace; namespace !== undefined; namespace = namespace.parent) {
        const entry = namespace.bindings.get(name);
        reads.push(
          Object.freeze({
            namespace,
            name,
            state: entry?.state ?? 'missing',
            ...(entry === undefined ? {} : { binding: entry.binding }),
          }),
        );
        if (entry === undefined) continue;
        if (options.ancestorScopes?.has(entry.binding)) {
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Compile,
            `Geometry reference cannot target ancestor Scope '${name}'`,
          );
        }
        if (entry.state === 'pending') throw pending;
        return { layout: entry.layout, irPath: entry.irPath, state: 'resolved' };
      }
      return undefined;
    },
    resolveExplicitBoundary: (boundary, reference) =>
      resolveBoundaryReference(boundary, {
        visualDef: reference.visualDef,
        visualParams: reference.visualParams,
        shapeRegistry: options.environment.shapes,
        boundaryRegistry: options.environment.boundaries,
        irPath: reference.irPath,
      }),
  });
  return {
    measureText: createTextMeasurement(options.environment.measureText),
    diagnostics,
    reads,
    pending,
    nodeGeometry,
    scopeChain,
    composedTransform,
    paint,
    clip,
    onWarn,
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
      reads: Object.freeze(workspace.reads),
      diagnostics: Object.freeze(
        orderCompileWarnings(
          workspace.diagnostics.map(warning => withCompileWarningOccurrence(warning, options.occurrence)),
        ),
      ),
    });
  } catch (error) {
    if (error === workspace.pending) {
      return Object.freeze({ status: 'pending', reads: Object.freeze(workspace.reads) });
    }
    if (error instanceof RetikzCoreError) throw error;
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Element compilation failed at ${options.irPath}`, {
      cause: error,
    });
  }
};
