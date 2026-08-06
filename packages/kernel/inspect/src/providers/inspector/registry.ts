import type { AnyInspectorDefinition, InspectorKey } from '../../shared';

import { normalizeInspectorDefinition } from '../../contract/inspector';

/** Inspector Definition 的 immutable registry */
export type InspectorRegistry = Readonly<{
  /** 输入顺序稳定的 definitions */
  definitions: ReadonlyArray<AnyInspectorDefinition>;
  /** 按 namespace/name 查找定义 */
  get: (key: InspectorKey) => AnyInspectorDefinition | undefined;
  /** 按 namespace/name 获取定义，缺失时 fail-loud */
  require: (key: InspectorKey) => AnyInspectorDefinition;
}>;

/** 把公开 Inspector key 转为 registry 内部键 */
export const inspectorRegistryKey = (key: InspectorKey): string => `${key.namespace}\u0000${key.name}`;

/** 创建无全局状态的 Inspector registry */
export const createInspectorRegistry = (definitions: ReadonlyArray<AnyInspectorDefinition>): InspectorRegistry => {
  const entries = new Map<string, AnyInspectorDefinition>();
  const normalized = definitions.map((definition, index) => {
    const candidate = normalizeInspectorDefinition(definition);
    const key = inspectorRegistryKey(candidate);
    if (entries.has(key)) {
      throw new Error(`Duplicate Inspector key '${candidate.namespace}/${candidate.name}' at index ${index}`);
    }
    entries.set(key, candidate);
    return candidate;
  });
  const frozen = Object.freeze(normalized);
  const get = (key: InspectorKey): AnyInspectorDefinition | undefined => entries.get(inspectorRegistryKey(key));
  return Object.freeze({
    definitions: frozen,
    get,
    require: (key: InspectorKey): AnyInspectorDefinition => {
      const definition = get(key);
      if (definition === undefined) throw new Error(`Inspector '${key.namespace}/${key.name}' is not registered`);
      return definition;
    },
  });
};
