import type { ShapeDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_SHAPES } from './definitions';

/** 解析 shape provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断。 */
export const resolveShapeRegistry = (shapes?: ReadonlyArray<ShapeDefinition>): ReadonlyMap<string, ShapeDefinition> =>
  resolveProviderRegistry({
    capability: 'shape',
    builtins: BUILTIN_SHAPES,
    custom: shapes,
    keyOf: definition => definition.name,
  });
