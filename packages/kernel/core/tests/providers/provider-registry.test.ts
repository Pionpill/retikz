import { describe, expect, it } from 'vitest';

import { BUILTIN_CLIPS } from '../../src/providers/clip';
import { providerDefinitionOf, createProviderRegistry } from '../../src/providers/registry';

type MockProvider = {
  name: string;
  value: number;
};

const provider = (name: string, value = 1): MockProvider => ({ name, value });

describe('provider registry contract', () => {
  it('merges_builtin_and_custom_definitions_into_a_readonly_map', () => {
    const builtins = new Map([['builtin', provider('builtin')]]);
    const registry = createProviderRegistry({
      capability: 'mock provider',
      builtins,
      custom: [provider('custom')],
      keyOf: def => def.name,
    });

    expect([...registry.keys()]).toEqual(['builtin', 'custom']);
    expect([...builtins.keys()]).toEqual(['builtin']);
    expect(registry.get('builtin')).toBe(builtins.get('builtin'));
    expect(providerDefinitionOf(registry, 'custom')).toEqual(provider('custom'));
  });

  it('fails_loud_when_custom_definition_collides_with_builtin', () => {
    expect(() =>
      createProviderRegistry({
        capability: 'mock provider',
        builtins: new Map([['builtin', provider('builtin')]]),
        custom: [provider('builtin', 2)],
        keyOf: def => def.name,
      }),
    ).toThrow(/duplicate mock provider registration: "builtin"/);
  });

  it('fails_loud_when_two_custom_definitions_share_the_same_key', () => {
    expect(() =>
      createProviderRegistry({
        capability: 'mock provider',
        custom: [provider('custom'), provider('custom', 2)],
        keyOf: def => def.name,
      }),
    ).toThrow(/duplicate mock provider registration: "custom"/);
  });

  it('unknown_lookup_message_lists_key_and_registered_names', () => {
    const registry = createProviderRegistry({
      capability: 'mock provider',
      builtins: new Map([['alpha', provider('alpha')]]),
      custom: [provider('beta')],
      keyOf: def => def.name,
    });

    expect(() => providerDefinitionOf(registry, 'gamma')).toThrow(/Unknown provider 'gamma'.*available: alpha, beta/s);
  });

  it('defaults_omitted_collections_to_empty_registries', () => {
    const registry = createProviderRegistry<MockProvider>({ capability: 'mock provider', keyOf: def => def.name });
    expect(registry.size).toBe(0);
  });

  it('indexes_retained_builtin_clips_by_kind', () => {
    expect(BUILTIN_CLIPS.get('rect')!.kind).toBe('rect');
  });
});
