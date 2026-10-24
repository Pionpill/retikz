import { resolvePath } from '../../resolve';
import type { IRPathBase } from '../../schemas';
import { filterAnimations } from '../orchestration';
import { bindPathTarget } from '../orchestration';
import type { CompileObservationContribution } from '../orchestration';
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
      ...context.environment,
      scopeDefaults: context.context.defaults,
      mode: context.context.theme.mode,
      scopeChain: workspace.scopeChain,
      targetResolver,
      irPath: context.irPath,
    });
    const observations: Array<CompileObservationContribution> = [];
    const result = emitDefinedPath(
      {
        path,
        irPath: context.irPath,
        scopeChain: workspace.scopeChain,
        scopeDefaults: context.context.defaults,
        theme: context.context.theme,
        occurrence: context.occurrence ?? { sourcePath: context.irPath, expansionPath: [] },
        ancestors: context.ancestors ?? [],
        observationSink: observations,
      },
      resolution,
      targetResolver,
      {
        ...context.environment,
        ...workspace,
        observation: context.observation,
        resolveTransform: composeScopeTransform,
      },
    );
    return Object.freeze({
      irPath: context.irPath,
      output: Object.freeze({
        zIndex: input.zIndex,
        primitives: result?.primitives ?? [],
        resources: workspace.paint.resources(),
        observations: observations.map(observation => ({ ...observation, scopeChain: [] })),
        bounds: result === null ? [] : [{ points: result.boundsPoints, shadow: resolution.path.shadow }],
      }),
    });
  });
