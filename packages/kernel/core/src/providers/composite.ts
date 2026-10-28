import type { AnyCompositeDefinition } from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';

/**
 * 解析 composite provider 注册表
 * @description 返回按 namespace、type 两级索引的只读 Map，通过 registry.get(namespace)?.get(type) 查找定义。两个字段独立匹配，允许包含点号；同一 namespace 下重复 type 直接报错，Core 不维护 namespace 白名单
 */
export const resolveCompositeRegistry = (
  composites?: ReadonlyArray<AnyCompositeDefinition>,
): ReadonlyMap<string, ReadonlyMap<string, AnyCompositeDefinition>> => {
  const registry = new Map<string, Map<string, AnyCompositeDefinition>>();

  for (const definition of composites ?? []) {
    const definitionsByType = registry.get(definition.namespace);
    if (definitionsByType === undefined) {
      registry.set(definition.namespace, new Map([[definition.type, definition]]));
      continue;
    }

    if (definitionsByType.has(definition.type)) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Provider,
        `duplicate composite registration: "${definition.namespace}.${definition.type}"`,
      );
    }

    definitionsByType.set(definition.type, definition);
  }

  return registry;
};
