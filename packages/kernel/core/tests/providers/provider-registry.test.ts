import { describe, expect, it } from 'vitest';

import { BUILTIN_CLIPS } from '../../src/providers/clip';
import { providerDefinitionOf, resolveProviderRegistry } from '../../src/providers/registry/index';

type MockProvider = {
  name: string;
  value: number;
};

const provider = (name: string, value = 1): MockProvider => ({ name, value });

describe('provider registry contract', () => {
  it('merges_builtin_and_custom_definitions_into_a_readonly_map', () => {
    const builtins = new Map([['builtin', provider('builtin')]]);
    const registry = resolveProviderRegistry({
      capability: 'mock provider',
      builtins,
      custom: [provider('custom')],
      keyOf: def => def.name,
    });

    expect([...registry.keys()]).toEqual(['builtin', 'custom']);
    expect([...builtins.keys()]).toEqual(['builtin']);
    expect(registry.get('builtin')).toBe(builtins.get('builtin'));
    expect(
      providerDefinitionOf(registry, 'custom', { capability: 'mock provider', optionName: 'mockProviders' }),
    ).toEqual(provider('custom'));
  });

  it('fails_loud_when_custom_definition_collides_with_builtin', () => {
    expect(() =>
      resolveProviderRegistry({
        capability: 'mock provider',
        builtins: new Map([['builtin', provider('builtin')]]),
        custom: [provider('builtin', 2)],
        keyOf: def => def.name,
      }),
    ).toThrow(/duplicate mock provider registration: "builtin"/);
  });

  it('fails_loud_when_two_custom_definitions_share_the_same_key', () => {
    expect(() =>
      resolveProviderRegistry({
        capability: 'mock provider',
        custom: [provider('custom'), provider('custom', 2)],
        keyOf: def => def.name,
      }),
    ).toThrow(/duplicate mock provider registration: "custom"/);
  });

  it('unknown_lookup_message_lists_registered_names_and_option_name', () => {
    const registry = resolveProviderRegistry({
      capability: 'mock provider',
      builtins: new Map([['alpha', provider('alpha')]]),
      custom: [provider('beta')],
      keyOf: def => def.name,
    });

    expect(() =>
      providerDefinitionOf(registry, 'gamma', { capability: 'mock provider', optionName: 'mockProviders' }),
    ).toThrow(/Unknown mock provider 'gamma'.*alpha, beta.*options\.mockProviders/s);
  });

  it.each(['', ' ', '\u2003'])('rejects_blank_provider_keys_at_registration_time (%j)', key => {
    expect(() =>
      resolveProviderRegistry({
        capability: 'mock provider',
        builtins: new Map([[key, provider(key)]]),
        keyOf: def => def.name,
      }),
    ).toThrowError('mock provider provider key must be a non-empty string.');
  });

  it('defaults_omitted_collections_to_empty_registries', () => {
    const registry = resolveProviderRegistry<MockProvider>({ capability: 'mock provider', keyOf: def => def.name });
    expect(registry.size).toBe(0);
  });

  it('indexes_retained_builtin_clips_by_kind', () => {
    expect(BUILTIN_CLIPS.get('rect')!.kind).toBe('rect');
  });
});
