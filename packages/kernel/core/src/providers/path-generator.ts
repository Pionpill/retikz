import type { PathGeneratorDefinition } from '../contract';
import { createProviderRegistry } from './registry';

/** Core 不提供路径生成器默认实现；调用方通过 `CompileOptions.pathGenerators` 显式装配 */
export const BUILTIN_PATH_GENERATORS: ReadonlyMap<string, PathGeneratorDefinition> = new Map();

/** 解析 path generator provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断 */
export const resolvePathGeneratorRegistry = (
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>,
): ReadonlyMap<string, PathGeneratorDefinition> =>
  createProviderRegistry({
    capability: 'path generator',
    builtins: BUILTIN_PATH_GENERATORS,
    custom: pathGenerators,
    keyOf: definition => definition.name,
  });
