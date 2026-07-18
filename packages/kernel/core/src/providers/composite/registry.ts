import type { CompositeDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_COMPOSITES } from './definitions';

const keyOfComposite = (definition: CompositeDefinition): string => `${definition.namespace}.${definition.type}`;

/** 解析 composite provider 注册表：以 namespace.type 为键合并内置项与自定义项并诊断冲突 */
export const resolveCompositeRegistry = (
  composites?: ReadonlyArray<CompositeDefinition>,
): ReadonlyMap<string, CompositeDefinition> =>
  resolveProviderRegistry({
    capability: 'composite',
    builtins: BUILTIN_COMPOSITES,
    custom: composites,
    keyOf: keyOfComposite,
  });
