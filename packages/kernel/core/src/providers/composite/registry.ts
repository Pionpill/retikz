import type { AnyCompositeDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_COMPOSITES } from './definitions';

const keyOfComposite = (definition: AnyCompositeDefinition): string => `${definition.namespace}.${definition.type}`;

/** 解析 composite provider 注册表：以 namespace.type 为键合并内置项与自定义项并诊断冲突 */
export const resolveCompositeRegistry = (
  composites?: ReadonlyArray<AnyCompositeDefinition>,
): ReadonlyMap<string, AnyCompositeDefinition> =>
  resolveProviderRegistry({
    capability: 'composite',
    builtins: BUILTIN_COMPOSITES,
    custom: composites,
    keyOf: keyOfComposite,
  });
