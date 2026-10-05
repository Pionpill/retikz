import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/**
 * 提供内置项、自定义项与键提取规则以建立能力定义索引
 * @template TDefinition 内置项、自定义项和键提取回调共享的定义类型
 */
export type ProviderRegistryOptions<TDefinition> = {
  /** 能力名称，用于错误信息 */
  capability: string;
  /** 内置 provider definitions，先注册 */
  builtins: ReadonlyArray<TDefinition>;
  /**
   * 运行时注入的 provider definitions
   * @default []
   */
  custom?: ReadonlyArray<TDefinition>;
  /** 从 definition 读取 registry key */
  keyOf: (definition: TDefinition) => string;
};

/** provider lookup 失败时的诊断上下文 */
export type ProviderLookupOptions = {
  /** 能力名称，用于错误信息 */
  capability: string;
  /** 对应 compile options 字段名，用于提示用户注入自定义 provider */
  optionName: string;
};

/** 使用 `name` 作为 registry key 的 provider definition 最小形态 */
export type NamedProviderDefinition = {
  /** provider 注册名 */
  name: string;
};

/**
 * 可按数组顺序或注册名称读取的能力定义集合
 * @template TDefinition 数组元素与名称索引对应的定义类型
 * @template TName 可通过属性访问的注册名；默认不限制名称集合
 */
export type NamedProviderArray<
  TDefinition extends NamedProviderDefinition,
  TName extends string = string,
> = ReadonlyArray<TDefinition> & Readonly<Record<TName, TDefinition>>;

/**
 * 可按数组顺序或指定键读取的能力定义集合
 * @template TDefinition 数组元素与键索引对应的定义类型
 * @template TKey 可通过属性访问的键；默认不限制键集合
 */
export type IndexedProviderArray<TDefinition, TKey extends string = string> = ReadonlyArray<TDefinition> &
  Readonly<Record<TKey, TDefinition>>;

/**
 * 支持按键查找的映射或按 name 查找的能力定义数组
 * @template TDefinition 查找返回的定义类型；数组元素额外要求 name 字段
 */
export type ProviderCollection<TDefinition> =
  | ReadonlyMap<string, TDefinition>
  | ReadonlyArray<TDefinition & NamedProviderDefinition>;

/**
 * 在原能力定义数组上添加以 name 为键的属性索引
 * @template TDefinition 含注册名称的定义类型，保留在数组和属性索引中
 * @template TKey 属性索引的键类型，需与实际 name 集合一致
 * @returns 传入数组的原引用；重复 name 的属性索引指向最后一项
 */
export const defineBuiltinProviderArray = <TDefinition extends NamedProviderDefinition, TKey extends string = string>(
  definitions: ReadonlyArray<TDefinition>,
): NamedProviderArray<TDefinition, TKey> =>
  defineKeyedProviderArray(definitions, definition => definition.name as TKey);

/**
 * 在原能力定义数组上添加由 keyOf 计算的属性索引
 * @template TDefinition 数组元素及属性索引值的类型
 * @template TKey keyOf 返回的键类型，保留在返回值的属性索引中
 * @param definitions 可添加属性的数组；函数会原位写入索引属性
 * @param keyOf 为每项计算属性键；重复键由最后一项覆盖
 * @returns 传入数组的原引用
 */
export const defineKeyedProviderArray = <TDefinition, TKey extends string = string>(
  definitions: ReadonlyArray<TDefinition>,
  keyOf: (definition: TDefinition) => TKey,
): IndexedProviderArray<TDefinition, TKey> =>
  Object.assign(
    definitions,
    Object.fromEntries(definitions.map(definition => [keyOf(definition), definition])) as Readonly<
      Record<TKey, TDefinition>
    >,
  );

const assertProviderKey = (capability: string, key: string): void => {
  assertNonEmptyString(
    key,
    `${capability} provider key`,
    new RetikzCoreError(RetikzCoreErrorCode.Provider, `${capability} provider key must be a non-empty string.`),
  );
};

const registeredNames = <TDefinition>(registry: ProviderCollection<TDefinition>): string => {
  const names = Array.isArray(registry) ? registry.map(definition => definition.name) : [...registry.keys()];
  return names.sort().join(', ') || '(none registered)';
};

/**
 * 按内置项、自定义项顺序建立新的能力定义索引
 * @template TDefinition 注册项的完整类型，原样保留在返回索引中
 * @throws RetikzCoreError 注册键为空或重复时抛出；自定义项不能覆盖内置项
 */
export const resolveProviderRegistry = <TDefinition>({
  capability,
  builtins,
  custom,
  keyOf,
}: ProviderRegistryOptions<TDefinition>): ReadonlyMap<string, TDefinition> => {
  const registry = new Map<string, TDefinition>();

  for (const definition of builtins) {
    const key = keyOf(definition);
    assertProviderKey(capability, key);
    if (registry.has(key)) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Provider, `duplicate ${capability} registration: "${key}"`);
    }

    registry.set(key, definition);
  }

  for (const definition of custom ?? []) {
    const key = keyOf(definition);
    assertProviderKey(capability, key);
    if (registry.has(key)) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Provider, `duplicate ${capability} registration: "${key}"`);
    }

    registry.set(key, definition);
  }

  return registry;
};

/**
 * 按注册键查找能力定义；数组形式匹配首个同名项
 * @template TDefinition 注册项及返回定义的类型
 * @throws RetikzCoreError 未找到定义时抛出，并提供已注册名称和注入入口
 */
export const providerDefinitionOf = <TDefinition>(
  registry: ProviderCollection<TDefinition>,
  key: string,
  { capability, optionName }: ProviderLookupOptions,
): TDefinition => {
  const definition = Array.isArray(registry)
    ? registry.find(item => item.name === key)
    : (registry as ReadonlyMap<string, TDefinition>).get(key);
  if (definition !== undefined) return definition;

  throw new RetikzCoreError(
    RetikzCoreErrorCode.Provider,
    `Unknown ${capability} '${key}'; available: ${registeredNames(registry)}. Pass a definition via options.${optionName}.`,
  );
};
