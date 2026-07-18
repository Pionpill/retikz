import type { RibbonWidthProfileDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_RIBBON_WIDTH_PROFILES } from './definitions';

/** 解析 ribbon width profile 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断 */
export const resolveRibbonWidthProfileRegistry = (
  profiles?: ReadonlyArray<RibbonWidthProfileDefinition>,
): ReadonlyMap<string, RibbonWidthProfileDefinition> =>
  resolveProviderRegistry({
    capability: 'ribbon width profile',
    builtins: BUILTIN_RIBBON_WIDTH_PROFILES,
    custom: profiles,
    keyOf: definition => definition.name,
  });
