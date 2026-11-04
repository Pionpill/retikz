import { resolvePath } from '../../resolve';
import { bindPathTargets } from './bind';
import type { PathHostCompileContext } from './emit';
import { emitDefinedPath } from './emit';
import type { PathTargetResolver } from './types';
import type { CompiledPath, InputPathCompilation } from './types';

/** 解析并生成引用已就绪的路径输出，供遍历与独立调用共同使用 */
export const compilePath = (
  input: InputPathCompilation,
  targetResolver: PathTargetResolver,
  context: PathHostCompileContext,
): CompiledPath => {
  const resolution = bindPathTargets(
    resolvePath(input.path, {
      scopeDefaults: input.scopeDefaults,
      mode: input.theme.mode,
      pathRegistry: context.registries.pathRegistry,
      arrowRegistry: context.registries.arrowRegistry,
      markRegistry: context.registries.markRegistry,
      patternRegistry: context.registries.patternRegistry,
      round: context.round,
      irPath: input.irPath,
    }),
    { scopeChain: input.scopeChain, targetResolver },
  );
  return { resolution, result: emitDefinedPath(input, resolution, targetResolver, context) };
};
