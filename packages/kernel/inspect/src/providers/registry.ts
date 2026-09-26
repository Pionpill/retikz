import type { AnyInspectorDefinition, AnyInspectorDefinitionInput, InspectorKey } from '../contract';
import { sealInspectorDefinition } from '../contract';
import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import { BUILTIN_INSPECTORS } from './definitions';

const inspectorRegistryBrand: unique symbol = Symbol('InspectorRegistry');

/** 已注册 Inspector 的不透明容器 */
export type InspectorRegistry = Readonly<{
  readonly [inspectorRegistryBrand]: true;
}>;

/** Inspector compile 路径消费的已解析 registry */
type ResolvedInspectorRegistry = InspectorRegistry &
  Readonly<{
    /** 输入顺序稳定的 definitions */
    definitions: ReadonlyArray<AnyInspectorDefinition>;
    /** 按 namespace/type 查找定义 */
    get: (key: InspectorKey) => AnyInspectorDefinition | undefined;
    /** 按 namespace/type 获取定义，缺失时 fail-loud */
    require: (key: InspectorKey) => AnyInspectorDefinition;
  }>;

/** 把公开 Inspector key 转为无歧义的 registry 内部键 */
export const formatInspectorRegistryKey = (key: InspectorKey): string => JSON.stringify([key.namespace, key.type]);

/** 创建无全局状态的 Inspector registry
 *
 * @param definitions 按注册顺序提供的 Inspector 定义；空数组创建空注册表
 * @returns 独立的只读注册表，定义在注册时补齐缺省选项并冻结
 * @throws 定义的 namespace、type 或所属者标识为空白，或存在重复 namespace/type 时抛出 RetikzInspectError
 */
export const createInspectorRegistry = (definitions: ReadonlyArray<AnyInspectorDefinitionInput>): InspectorRegistry => {
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
    [inspectorRegistryBrand]: true as const,
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

/** 合并多个已创建的 registry，保持各 registry 的定义顺序
 *
 * @param registries 按合并顺序传入的注册表；不传参数时创建空注册表
 * @returns 包含各输入注册表定义的新只读注册表，不修改输入
 * @throws 不同注册表包含相同 namespace/type 时抛出 RetikzInspectError，不覆盖先前定义
 */
export const mergeInspectorRegistries = (...registries: ReadonlyArray<InspectorRegistry>): InspectorRegistry =>
  createInspectorRegistry(registries.flatMap(registry => getResolvedInspectorRegistry(registry).definitions));

/** 取得编译路径使用的已解析 registry */
export const getResolvedInspectorRegistry = (registry: InspectorRegistry): ResolvedInspectorRegistry =>
  registry as ResolvedInspectorRegistry;

/** 创建内置优先、第三方同路的默认 Inspector registry
 *
 * @param definitions 追加在五类内置 Inspector 之后的自定义定义，省略时仅注册内置定义
 * @returns 包含内置与自定义定义的新只读注册表
 * @throws 自定义定义无效或与内置、自定义定义的 namespace/type 重复时抛出 RetikzInspectError
 */
export const createDefaultInspectorRegistry = (
  definitions: ReadonlyArray<AnyInspectorDefinitionInput> = [],
): InspectorRegistry => createInspectorRegistry([...BUILTIN_INSPECTORS, ...definitions]);
