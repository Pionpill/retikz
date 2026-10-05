/**
 * 冻结 definition 列表及其直接元素
 * @description 阻止公开内置列表与 definition 属性被运行时改写；schema 等嵌套依赖保持原有实例
 * @template TDefinition 要冻结的定义对象类型，保留数组成员的精确类型
 */
export const freezeDefinitions = <TDefinition extends object>(
  definitions: ReadonlyArray<TDefinition>,
): ReadonlyArray<TDefinition> => Object.freeze(definitions.map(definition => Object.freeze(definition)));
