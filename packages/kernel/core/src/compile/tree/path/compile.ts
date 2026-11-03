import { resolveAnimations, resolvePath } from '../../../resolve';
import type { PathTargetResolver } from '../../../resolve';
import type { IRPathBase } from '../../../schemas';
import { composeScopeTransform } from '../../shared';
import type { ElementCompileOptions, ElementCompileResult } from '../shared';
import { runElementCompilation } from '../shared';
import type { PathCompileHost } from './emit';
import { emitDefinedPath } from './emit';
import { createPathTargetResolver } from './index';
import type { CompiledPath, InputPathCompilation } from './types';

/** Path 单元素编译上下文 */
export type PathElementCompileContext = ElementCompileOptions;

/** 引用就绪后独立编译 Path，复用全量路径的 kind 宿主能力 */
export const compilePath = (
  input: IRPathBase,
  context: PathElementCompileContext,
): ElementCompileResult<CompiledPath> =>
  runElementCompilation(context, runtime => {
    const { workspace } = runtime.state;
    const path = {
      ...input,
      animations: resolveAnimations(input.animations, {
        target: 'element',
        onWarn: workspace.diagnosticCollector.collect,
        irPath: context.irPath,
      }),
    };
    const targetResolver = createPathTargetResolver(() => runtime.context.positionContext);
    const { result, resolution } = compilePathState(
      {
        path,
        irPath: context.irPath,
        scopeChain: runtime.context.transformChain,
        scopeDefaults: context.style.defaults,
        theme: context.style.theme,
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
        resources: workspace.paintRegistry.getResources(),
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
