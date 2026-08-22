import type { AnyInspectorDefinition, InspectorKey } from '../contract';

import { sealInspectorDefinition } from '../contract';
import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import { BUILTIN_INSPECTORS } from './definitions';

/** Inspector Definition 的 immutable registry */
export type InspectorRegistry = Readonly<{
  /** 输入顺序稳定的 definitions */
  definitions: ReadonlyArray<AnyInspectorDefinition>;
  /** 按 namespace/type 查找定义 */
  get: (key: InspectorKey) => AnyInspectorDefinition | undefined;
  /** 按 namespace/type 获取定义，缺失时 fail-loud */
  require: (key: InspectorKey) => AnyInspectorDefinition;
}>;

/** 把公开 Inspector key 转为无歧义的 registry 内部键 */
export const formatInspectorRegistryKey = (key: InspectorKey): string => JSON.stringify([key.namespace, key.type]);

/** 创建无全局状态的 Inspector registry */
export const createInspectorRegistry = (definitions: ReadonlyArray<AnyInspectorDefinition>): InspectorRegistry => {
  const definitionsByKey = new Map<string, AnyInspectorDefinition>();
  const sealedDefinitions = definitions.map((definition, index) => {
    const candidateDefinition = sealInspectorDefinition(definition);
    const definitionKey = formatInspectorRegistryKey(candidateDefinition);
    if (definitionsByKey.has(definitionKey)) {
      throw new RetikzInspectError(
        RetikzInspectErrorCode.Registry,
        `Duplicate Inspector key '${candidateDefinition.namespace}/${candidateDefinition.type}' at index ${index}`,
      );
    }
    definitionsByKey.set(definitionKey, candidateDefinition);
    return candidateDefinition;
  });
  const frozenDefinitions = Object.freeze(sealedDefinitions);
  const get = (key: InspectorKey): AnyInspectorDefinition | undefined =>
    definitionsByKey.get(formatInspectorRegistryKey(key));
  return Object.freeze({
    definitions: frozenDefinitions,
    get,
    require: (key: InspectorKey): AnyInspectorDefinition => {
      const definition = get(key);
      if (definition === undefined)
        throw new RetikzInspectError(
          RetikzInspectErrorCode.Registry,
          `Inspector '${key.namespace}/${key.type}' is not registered`,
        );
      return definition;
    },
  });
};

/** 创建内置优先、第三方同路的默认 Inspector registry */
export const createDefaultInspectorRegistry = (definitions: ReadonlyArray<AnyInspectorDefinition> = []) =>
  createInspectorRegistry([...BUILTIN_INSPECTORS, ...definitions]);
