import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/**
 * 提供内置项、自定义项与键提取规则以建立能力定义索引
 * @template TDefinition 内置项、自定义项和键提取回调共享的定义类型
 */
export type ProviderRegistryOptions<TDefinition> = {
  /** 能力名称，用于错误信息 */
  capability: string;
  /**
   * 内置 provider 注册表，先注册
   * @default new Map()
   */
  builtins?: ProviderRegistry<TDefinition>;
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

/** 按注册键索引的能力定义集合 */
export type ProviderRegistry<TDefinition> = ReadonlyMap<string, TDefinition>;

const registeredNames = <TDefinition>(registry: ProviderRegistry<TDefinition>): string => {
  const names = [...registry.keys()];
  return names.sort().join(', ') || '(none registered)';
};

/**
 * 按内置项、自定义项顺序建立新的能力定义索引
 * @template TDefinition 注册项的完整类型，原样保留在返回索引中
 * @throws RetikzCoreError 注册键为空或重复时抛出；自定义项不能覆盖内置项
 */
export const resolveProviderRegistry = <TDefinition>({
  capability,
  builtins = new Map(),
  custom = [],
  keyOf,
}: ProviderRegistryOptions<TDefinition>): ProviderRegistry<TDefinition> => {
  const registry = new Map<string, TDefinition>();
  const assertProviderKey = (key: string): void => {
    assertNonEmptyString(
      key,
      `${capability} provider key`,
      () => new RetikzCoreError(RetikzCoreErrorCode.Provider, `${capability} provider key must be a non-empty string.`),
    );
  };

  for (const [key, definition] of builtins) {
    assertProviderKey(key);
    registry.set(key, definition);
  }

  for (const definition of custom) {
    const key = keyOf(definition);
    assertProviderKey(key);
    if (registry.has(key)) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Provider, `duplicate ${capability} registration: "${key}"`);
    }

    registry.set(key, definition);
  }

  return registry;
};

/**
 * 按注册键查找能力定义
 * @template TDefinition 注册项及返回定义的类型
 * @throws RetikzCoreError 未找到定义时抛出，并提供已注册名称和注入入口
 */
export const providerDefinitionOf = <TDefinition>(
  registry: ProviderRegistry<TDefinition>,
  key: string,
  { capability, optionName }: ProviderLookupOptions,
): TDefinition => {
  const definition = registry.get(key);
  if (definition !== undefined) return definition;

  throw new RetikzCoreError(
    RetikzCoreErrorCode.Provider,
    `Unknown ${capability} '${key}'; available: ${registeredNames(registry)}. Pass a definition via options.${optionName}.`,
  );
};
