export type ProviderRegistryOptions<TDefinition> = {
  capability: string;
  builtins: ReadonlyArray<TDefinition>;
  custom?: ReadonlyArray<TDefinition>;
  keyOf: (definition: TDefinition) => string;
  optionName: string;
};

export type ProviderLookupOptions = {
  capability: string;
  optionName: string;
};

export type NamedProviderDefinition = {
  name: string;
};

export type NamedProviderArray<TDefinition extends NamedProviderDefinition, TName extends string = string> =
  ReadonlyArray<TDefinition> & Readonly<Record<TName, TDefinition>>;

export type ProviderCollection<TDefinition> =
  | ReadonlyMap<string, TDefinition>
  | ReadonlyArray<TDefinition & NamedProviderDefinition>;

export const defineBuiltinProviderArray = <TDefinition extends NamedProviderDefinition, TName extends string = string>(
  definitions: ReadonlyArray<TDefinition>,
): NamedProviderArray<TDefinition, TName> =>
  Object.assign(
    definitions,
    Object.fromEntries(definitions.map(definition => [definition.name, definition])) as Readonly<
      Record<TName, TDefinition>
    >,
  );

const assertProviderKey = (capability: string, key: string): void => {
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new Error(`${capability} provider key must be a non-empty string.`);
  }
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
