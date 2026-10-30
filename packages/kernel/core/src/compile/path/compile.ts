import type { PathTargetResolver } from '../../resolve';
import { resolvePath } from '../../resolve';
import type { IRPathBase } from '../../schemas';
import { filterAnimations } from '../animation';
import type { ElementCompileOptions, ElementCompileResult } from '../context';
import { runElementCompilation } from '../context';
import { createPathTargetResolver } from '../reference';
import { composeScopeTransform } from '../transform';
import type { PathCompileHost } from './emit';
import { emitDefinedPath } from './emit';
import type { CompiledPath, InputPathCompilation } from './types';

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
        onWarn: workspace.diagnostics.collect,
        irPath: context.irPath,
      }),
    };
    const targetResolver = createPathTargetResolver(() => workspace.positionContext);
    const { result, resolution } = compilePathState(
      {
        path,
        irPath: context.irPath,
        scopeChain: workspace.scopeChain,
        scopeDefaults: context.context.defaults,
        theme: context.context.theme,
        occurrence: context.occurrence ?? { sourcePath: context.irPath, expansionPath: [] },
      },
      targetResolver,
      { shared: context.shared, workspace, resolveTransform: composeScopeTransform },
    );
    return Object.freeze({
      irPath: context.irPath,
      output: Object.freeze({
        zIndex: input.zIndex,
        primitives: result?.primitives ?? [],
        resources: workspace.paintRegistry.resources(),
        bounds: result === null ? [] : [{ boundsPoints: result.boundsPoints, shadow: resolution.path.shadow }],
      }),
    });
  });

/** 解析并生成引用已就绪的路径输出，供遍历与独立调用共同使用 */
export const compilePathState = (
  input: InputPathCompilation,
  targetResolver: PathTargetResolver,
  context: PathCompileHost,
) => {
  const resolution = resolvePath(input.path, {
    scopeDefaults: input.scopeDefaults,
    mode: input.theme.mode,
    scopeChain: input.scopeChain,
    targetResolver,
    pathRegistry: context.shared.registries.pathRegistry,
    arrowRegistry: context.shared.registries.arrowRegistry,
    markRegistry: context.shared.registries.markRegistry,
    patternRegistry: context.shared.registries.patternRegistry,
    round: context.shared.layout.round,
    irPath: input.irPath,
  });
  return { resolution, result: emitDefinedPath(input, resolution, targetResolver, context) };
};
