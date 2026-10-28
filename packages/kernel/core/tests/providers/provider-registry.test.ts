import { describe, expect, it } from 'vitest';

import { defineTheme, RetikzCoreError, RetikzCoreErrorCode, resolveThemeRegistry } from '../../src';
import { BUILTIN_CLIPS } from '../../src/providers/clip';
import { getProviderDefinition, createProviderRegistry } from '../../src/providers/registry';

type MockProvider = {
  name: string;
  value: number;
};

const provider = (name: string, value = 1): MockProvider => ({ name, value });

describe('提供者注册契约', () => {
  it('主题注册保留定义且拒绝同名覆盖', () => {
    const theme = defineTheme({ name: 'custom', resolve: () => ({}) });
    const replacement = defineTheme({ name: 'custom', resolve: () => ({ semantic: { guide: 'red' } }) });

    expect(resolveThemeRegistry().size).toBe(0);
    expect(resolveThemeRegistry([theme]).get('custom')).toBe(theme);
    expect(() => resolveThemeRegistry([theme, replacement])).toThrow(RetikzCoreError);
    expect(() => resolveThemeRegistry([theme, replacement])).toThrow(
      expect.objectContaining({ code: RetikzCoreErrorCode.Provider }),
    );
  });

  it('将内置和自定义定义合并到只读映射中', () => {
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
    expect(getProviderDefinition(registry, 'custom')).toEqual(provider('custom'));
  });

  it('自定义定义与内置定义冲突时明确报错', () => {
    expect(() =>
      createProviderRegistry({
        capability: 'mock provider',
        builtins: new Map([['builtin', provider('builtin')]]),
        custom: [provider('builtin', 2)],
        keyOf: def => def.name,
      }),
    ).toThrow(/duplicate mock provider registration: "builtin"/);
  });

  it('两个自定义定义使用相同键时明确报错', () => {
    expect(() =>
      createProviderRegistry({
        capability: 'mock provider',
        custom: [provider('custom'), provider('custom', 2)],
        keyOf: def => def.name,
      }),
    ).toThrow(/duplicate mock provider registration: "custom"/);
  });

  it('查找未知键时错误消息列出该键和已注册名称', () => {
    const registry = createProviderRegistry({
      capability: 'mock provider',
      builtins: new Map([['alpha', provider('alpha')]]),
      custom: [provider('beta')],
      keyOf: def => def.name,
    });

    expect(() => getProviderDefinition(registry, 'gamma')).toThrow(/Unknown provider 'gamma'.*available: alpha, beta/s);
  });

  it('默认省略的集合为空注册表', () => {
    const registry = createProviderRegistry<MockProvider>({ capability: 'mock provider', keyOf: def => def.name });
    expect(registry.size).toBe(0);
  });

  it('按类型索引保留的内置裁剪', () => {
    expect(BUILTIN_CLIPS.get('rect')!.kind).toBe('rect');
  });
});
