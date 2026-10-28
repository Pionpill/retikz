import { resolvePath } from '../../resolve';
import type { IRPathBase } from '../../schemas';
import { bindPathTarget, filterAnimations } from '../orchestration';
import { emitDefinedPath } from '../path';
import { composeScopeTransform } from '../transform';
import { runElementCompilation } from './context';
import type { CompiledPath, ElementCompileOptions, ElementCompileResult } from './types';

/** Path 单元素编译上下文 */
export type PathElementCompileContext = ElementCompileOptions;

/** 引用就绪后独立编译 Path，复用全量路径的 kind 宿主能力 */
export const compilePath = (
  input: IRPathBase,
  context: PathElementCompileContext,
): ElementCompileResult<CompiledPath> =>
  runElementCompilation(context, workspace => {
    const path = {
      ...input,
      animations: filterAnimations(input.animations, {
        target: 'element',
        onWarn: workspace.onWarn,
        irPath: context.irPath,
      }),
    };
    const targetResolver = {
      pointOfTarget: (target: Parameters<typeof bindPathTarget>[0]) =>
        bindPathTarget(target, workspace.positionContext)?.point ?? null,
      refPointOfTarget: (target: Parameters<typeof bindPathTarget>[0]) =>
        bindPathTarget(target, workspace.positionContext)?.referencePoint ?? null,
      bindTarget: (target: Parameters<typeof bindPathTarget>[0]) => bindPathTarget(target, workspace.positionContext),
    };
    const resolution = resolvePath(path, {
      round: context.environment.round,
      pathRegistry: context.environment.paths,
      arrowRegistry: context.environment.arrows,
      markRegistry: context.environment.marks,
      patternRegistry: context.environment.patterns,
      scopeDefaults: context.context.defaults,
      mode: context.context.theme.mode,
      scopeChain: workspace.scopeChain,
      targetResolver,
      irPath: context.irPath,
    });
    const result = emitDefinedPath(
      {
        path,
        irPath: context.irPath,
        scopeChain: workspace.scopeChain,
        scopeDefaults: context.context.defaults,
        theme: context.context.theme,
        occurrence: context.occurrence ?? { sourcePath: context.irPath, expansionPath: [] },
      },
      resolution,
      targetResolver,
      {
        ...context.environment,
        ...workspace,
        resolveTransform: composeScopeTransform,
      },
    );
    return Object.freeze({
      irPath: context.irPath,
      output: Object.freeze({
        zIndex: input.zIndex,
        primitives: result?.primitives ?? [],
        resources: workspace.paint.resources(),
        bounds: result === null ? [] : [{ boundsPoints: result.boundsPoints, shadow: resolution.path.shadow }],
      }),
    });
  });
