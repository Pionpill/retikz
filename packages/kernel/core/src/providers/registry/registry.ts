import { assertNonEmptyString } from '@retikz/foundation';

/** provider registry 解析输入：内置项、自定义项和 key 提取规则 */
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

/** 带同名属性索引的内置 provider 数组 */
export type NamedProviderArray<
  TDefinition extends NamedProviderDefinition,
  TName extends string = string,
> = ReadonlyArray<TDefinition> & Readonly<Record<TName, TDefinition>>;

/** 带 key 属性索引的内置 provider 数组 */
export type IndexedProviderArray<TDefinition, TKey extends string = string> = ReadonlyArray<TDefinition> &
  Readonly<Record<TKey, TDefinition>>;

/** provider lookup 可消费的 registry 形态 */
export type ProviderCollection<TDefinition> =
  | ReadonlyMap<string, TDefinition>
  | ReadonlyArray<TDefinition & NamedProviderDefinition>;

/** 为使用 `name` 作为 key 的内置 provider 数组补同名属性索引 */
export const defineBuiltinProviderArray = <TDefinition extends NamedProviderDefinition, TKey extends string = string>(
  definitions: ReadonlyArray<TDefinition>,
): NamedProviderArray<TDefinition, TKey> =>
  defineKeyedProviderArray(definitions, definition => definition.name as TKey);

/** 为使用自定义 key 的内置 provider 数组补属性索引 */
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
  assertNonEmptyString(key, `${capability} provider key`);
};

const registeredNames = <TDefinition>(registry: ProviderCollection<TDefinition>): string => {
  const names = Array.isArray(registry) ? registry.map(definition => definition.name) : [...registry.keys()];
  return names.sort().join(', ') || '(none registered)';
};

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
      throw new Error(`duplicate ${capability} registration: "${key}"`);
    }
    registry.set(key, definition);
  }
  for (const definition of custom ?? []) {
    const key = keyOf(definition);
    assertProviderKey(capability, key);
    if (registry.has(key)) {
      throw new Error(`duplicate ${capability} registration: "${key}"`);
    }
    registry.set(key, definition);
  }
  return registry;
};

export const providerDefinitionOf = <TDefinition>(
  registry: ProviderCollection<TDefinition>,
  key: string,
  { capability, optionName }: ProviderLookupOptions,
): TDefinition => {
  const definition = Array.isArray(registry)
    ? registry.find(item => item.name === key)
    : (registry as ReadonlyMap<string, TDefinition>).get(key);
  if (definition !== undefined) return definition;
  throw new Error(
    `Unknown ${capability} '${key}'; available: ${registeredNames(registry)}. Pass a definition via options.${optionName}.`,
  );
};
