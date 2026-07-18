import type { PathGeneratorDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_PATH_GENERATORS } from './definitions';

/** 解析 path generator provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断 */
export const resolvePathGeneratorRegistry = (
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>,
): ReadonlyMap<string, PathGeneratorDefinition> =>
  resolveProviderRegistry({
    capability: 'path generator',
    builtins: BUILTIN_PATH_GENERATORS,
    custom: pathGenerators,
    keyOf: definition => definition.name,
  });
