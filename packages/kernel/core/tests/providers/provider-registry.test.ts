import { describe, expect, it } from 'vitest';

import {
  defineArrow,
  defineTheme,
  RetikzCoreError,
  RetikzCoreErrorCode,
  resolveArrowRegistry,
  resolveThemeRegistry,
} from '../../src';
import { BUILTIN_CLIPS } from '../../src/providers/clip';
import { resolveMarkRegistry } from '../../src/providers/mark';
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

describe('静态标记几何注册准入', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('未被使用的箭头也拒绝无效基准尺寸 %s', baseSize => {
    const arrow = { name: 'invalid-base', baseSize, backX: 0, lineContactX: 0, emit: () => [] };
    expect(() => resolveArrowRegistry([arrow])).toThrow(
      expect.objectContaining({ code: RetikzCoreErrorCode.CompositeContractViolation }),
    );
  });

  it('经 define 或直接构造的箭头使用同一注册约束', () => {
    const arrow = { name: 'invalid-order', backX: 4, lineContactX: 2, emit: () => [] };
    expect(() => resolveArrowRegistry([arrow])).toThrow(/backX.*lineContactX.*tipX/);
    expect(() => resolveArrowRegistry([defineArrow(arrow)])).toThrow(/backX.*lineContactX.*tipX/);
  });

  it('再次注册会检查已变更的定义', () => {
    const arrow = { name: 'mutable', backX: 0, lineContactX: 0, emit: () => [] };
    expect(resolveArrowRegistry([arrow]).get('mutable')).toBe(arrow);
    arrow.backX = Number.POSITIVE_INFINITY;
    expect(() => resolveArrowRegistry([arrow])).toThrow(/non-finite backX/);
  });

  it('普通标记注册拒绝非正基准尺寸和非有限锚点', () => {
    expect(() => resolveMarkRegistry([{ name: 'zero', baseSize: 0, emit: () => [] }], new Map())).toThrow(/baseSize/);
    expect(() =>
      resolveMarkRegistry([{ name: 'invalid-anchor', anchor: [Number.NaN, 0], emit: () => [] }], new Map()),
    ).toThrow(/anchor/);
  });
});
