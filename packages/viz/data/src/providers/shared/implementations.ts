import type { ZodType } from 'zod';

import { RetikzDataError } from '../../error';

/**
 * 合并计算实现，并校验其引用当前 registry 的唯一语义身份
 * @template TDefinition 提供语义 schema 的定义类型
 * @template TImplementation 引用同一语义定义对象的计算实现类型
 */
export const resolveImplementationRegistry = <
  TDefinition extends { schema: ZodType },
  TImplementation extends { definition: TDefinition },
>(
  definitions: ReadonlyMap<string, TDefinition>,
  implementations: ReadonlyArray<TImplementation>,
  extractKind: (schema: ZodType) => string,
): Map<string, TImplementation> => {
  const registry = new Map<string, TImplementation>();

  for (const implementation of implementations) {
    const kind = extractKind(implementation.definition.schema);
    if (definitions.get(kind) !== implementation.definition) {
      throw new RetikzDataError(`data: implementation "${kind}" must reference the registered semantic Definition`);
    }

    if (registry.has(kind)) throw new RetikzDataError(`data: duplicate implementation registration: "${kind}"`);

    registry.set(kind, implementation);
  }

  return registry;
};
