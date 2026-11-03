import { resolvePath } from '../../../resolve';
import type { PathTargetResolver } from '../../../resolve';
import type { PathHostCompileContext } from './emit';
import { emitDefinedPath } from './emit';
import type { CompiledPath, InputPathCompilation } from './types';

/** 解析并生成引用已就绪的路径输出，供遍历与独立调用共同使用 */
export const compilePath = (
  input: InputPathCompilation,
  targetResolver: PathTargetResolver,
  context: PathHostCompileContext,
): CompiledPath => {
  const resolution = resolvePath(input.path, {
    scopeDefaults: input.scopeDefaults,
    mode: input.theme.mode,
    scopeChain: input.scopeChain,
    targetResolver,
    pathRegistry: context.registries.pathRegistry,
    arrowRegistry: context.registries.arrowRegistry,
    markRegistry: context.registries.markRegistry,
    patternRegistry: context.registries.patternRegistry,
    round: context.round,
    irPath: input.irPath,
  });
  return { resolution, result: emitDefinedPath(input, resolution, targetResolver, context) };
};
