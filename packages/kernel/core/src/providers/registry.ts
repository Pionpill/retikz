import { RetikzCoreError, RetikzCoreErrorCode } from '../error';

/**
 * 创建能力注册表所需的内置项、自定义项与键提取规则
 * @template TDefinition 内置项、自定义项和键提取回调共享的定义类型
 */
export type CreateProviderRegistryOptions<TDefinition> = {
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

/** 按注册键索引的能力定义集合 */
export type ProviderRegistry<TDefinition> = ReadonlyMap<string, TDefinition>;

/**
 * 按内置项、自定义项顺序创建新的能力注册表
 * @template TDefinition 注册项的完整类型，原样保留在返回的注册表中
 * @throws RetikzCoreError 注册键重复时抛出；自定义项不能覆盖内置项
 */
export const createProviderRegistry = <TDefinition>({
  capability,
  builtins = new Map(),
  custom = [],
  keyOf,
}: CreateProviderRegistryOptions<TDefinition>): ProviderRegistry<TDefinition> => {
  const registry = new Map(builtins);

  for (const definition of custom) {
    const key = keyOf(definition);
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
 * @throws RetikzCoreError 未找到定义时抛出，并提供已注册名称
 */
export const providerDefinitionOf = <TDefinition>(
  registry: ProviderRegistry<TDefinition>,
  key: string,
): TDefinition => {
  const registeredNames = (): string => {
    const names = [...registry.keys()];
    return names.sort().join(', ') || '(none registered)';
  };

  const definition = registry.get(key);
  if (definition !== undefined) return definition;

  throw new RetikzCoreError(
    RetikzCoreErrorCode.Provider,
    `Unknown provider '${key}'; available: ${registeredNames()}.`,
  );
};
