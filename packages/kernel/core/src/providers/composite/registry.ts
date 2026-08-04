import type { AnyCompositeDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_COMPOSITES } from './definitions';

const keyOfComposite = (definition: AnyCompositeDefinition): string => `${definition.namespace}.${definition.type}`;

/**
 * 解析 composite provider 注册表
 * @description Core 不维护上层包的 namespace 白名单；所有 definition 沿同一顺序按完整 namespace.type 键注册，首个键建立解析逻辑，重复键直接报错
 */
export const resolveCompositeRegistry = (
  composites?: ReadonlyArray<AnyCompositeDefinition>,
): ReadonlyMap<string, AnyCompositeDefinition> =>
  resolveProviderRegistry({
    capability: 'composite',
    builtins: BUILTIN_COMPOSITES,
    custom: composites,
    keyOf: keyOfComposite,
  });
