import { describe, expect, it } from 'vitest';

import { providerDefinitionOf, resolveProviderRegistry } from '../../src/providers/registry';

type MockProvider = {
  name: string;
  value: number;
};

const provider = (name: string, value = 1): MockProvider => ({ name, value });

describe('provider registry contract', () => {
  it('merges_builtin_and_custom_definitions_into_a_readonly_map', () => {
    const registry = resolveProviderRegistry({
      capability: 'mock provider',
      builtins: [provider('builtin')],
      custom: [provider('custom')],
      keyOf: def => def.name,
      optionName: 'mockProviders',
    });

    expect([...registry.keys()]).toEqual(['builtin', 'custom']);
    expect(providerDefinitionOf(registry, 'custom', { capability: 'mock provider', optionName: 'mockProviders' })).toEqual(
      provider('custom'),
    );
  });

  it('fails_loud_when_custom_definition_collides_with_builtin', () => {
    expect(() =>
      resolveProviderRegistry({
        capability: 'mock provider',
        builtins: [provider('builtin')],
        custom: [provider('builtin', 2)],
        keyOf: def => def.name,
        optionName: 'mockProviders',
      }),
    ).toThrow(/duplicate mock provider registration: "builtin"/);
  });

  it('fails_loud_when_two_custom_definitions_share_the_same_key', () => {
    expect(() =>
      resolveProviderRegistry({
        capability: 'mock provider',
        builtins: [],
        custom: [provider('custom'), provider('custom', 2)],
        keyOf: def => def.name,
        optionName: 'mockProviders',
      }),
    ).toThrow(/duplicate mock provider registration: "custom"/);
  });

  it('unknown_lookup_message_lists_registered_names_and_option_name', () => {
    const registry = resolveProviderRegistry({
      capability: 'mock provider',
      builtins: [provider('alpha')],
      custom: [provider('beta')],
      keyOf: def => def.name,
      optionName: 'mockProviders',
    });

    expect(() =>
      providerDefinitionOf(registry, 'gamma', { capability: 'mock provider', optionName: 'mockProviders' }),
    ).toThrow(/Unknown mock provider 'gamma'.*alpha, beta.*options\.mockProviders/s);
  });

  it('rejects_empty_provider_keys_at_registration_time', () => {
    expect(() =>
      resolveProviderRegistry({
        capability: 'mock provider',
        builtins: [provider('')],
        custom: [],
        keyOf: def => def.name,
        optionName: 'mockProviders',
      }),
    ).toThrow(/non-empty string/);
  });
});
