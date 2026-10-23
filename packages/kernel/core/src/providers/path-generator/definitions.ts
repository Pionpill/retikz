import type { PathGeneratorDefinition } from '../../contract';

/** Core 不提供路径生成器默认实现；调用方通过 `CompileOptions.pathGenerators` 显式装配 */
export const BUILTIN_PATH_GENERATORS: ReadonlyMap<string, PathGeneratorDefinition> = new Map();
