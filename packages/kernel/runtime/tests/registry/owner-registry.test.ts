import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { RuntimeOwnerDefinition } from '../../src';

import { createRuntimeOwnerRegistry, defineRuntimeOwner } from '../../src';

const defineNumberOwner = (key: string) =>
  defineRuntimeOwner<number, Readonly<{ value: number }>, number, Readonly<{ delta: number }>>({
    key,
    value: {
      capture: input => Object.freeze({ value: input }),
      read: value => value.value,
      equals: (left, right) => left.value === right.value,
    },
  });

describe('runtime owner registry', () => {
  it('以同一 registry 合并 builtin/custom 并保留 typed token', () => {
    const builtin = defineNumberOwner('builtin');
    const custom = defineRuntimeOwner<string, string, string, never>({
      key: 'custom',
      value: { capture: input => input, read: value => value, equals: (left, right) => left === right },
    });
    const registry = createRuntimeOwnerRegistry({ builtins: [builtin], custom: [custom] });

    expect(registry.resolve(builtin)).toBe(builtin);
    expect(registry.resolve(custom)).toBe(custom);
    expect(registry.find('builtin')).toBe(builtin);
    expectTypeOf(registry.resolve(builtin)).toEqualTypeOf<typeof builtin>();
    expectTypeOf(registry.find('builtin')).not.toHaveProperty('capture');
  });

  it('按 key code-unit 顺序返回 immutable definitions copy', () => {
    const b = defineNumberOwner('b');
    const upper = defineNumberOwner('A');
    const a = defineNumberOwner('a');
    const registry = createRuntimeOwnerRegistry({ custom: [b, a], builtins: [upper] });

    expect(registry.definitions().map(definition => definition.key)).toEqual(['A', 'a', 'b']);
    expect(Object.isFrozen(registry.definitions())).toBe(true);
    expect(registry.definitions()).not.toBe(registry.definitions());
  });

  it('拒绝 builtin/custom 重复 key，不采用覆盖优先级', () => {
    expect(() =>
      createRuntimeOwnerRegistry({ builtins: [defineNumberOwner('same')], custom: [defineNumberOwner('same')] }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_OWNER_DUPLICATE', owner: 'same' }));
  });

  it('拒绝未注册但合法的 Definition', () => {
    const registered = defineNumberOwner('registered');
    const unknown = defineNumberOwner('unknown');
    const registry = createRuntimeOwnerRegistry({ builtins: [registered] });

    expect(() => registry.resolve(unknown)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_UNKNOWN', owner: 'unknown' }),
    );
    expect(registry.find('unknown')).toBeUndefined();
  });

  it('以 object identity guard 拒绝结构伪造和 clone token', () => {
    const definition = defineNumberOwner('owner');
    const registry = createRuntimeOwnerRegistry({ builtins: [definition] });
    const forged = { key: 'owner' } as RuntimeOwnerDefinition<number, { value: number }, number, { delta: number }>;
    const cloned = structuredClone(definition) as RuntimeOwnerDefinition<
      number,
      { value: number },
      number,
      { delta: number }
    >;

    expect(() => registry.resolve(forged)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_TOKEN_INVALID', owner: 'owner' }),
    );
    expect(() => registry.resolve(cloned)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_TOKEN_INVALID', owner: 'owner' }),
    );
  });

  it('拒绝另一 Runtime module instance 创建的 foreign token', async () => {
    vi.resetModules();
    const { defineRuntimeOwner: defineForeignRuntimeOwner } = await import('../../src/owner/define');
    const foreign = defineForeignRuntimeOwner<number, number, number, never>({
      key: 'foreign',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });

    expect(() => createRuntimeOwnerRegistry({ custom: [foreign] })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_TOKEN_INVALID', owner: 'foreign' }),
    );
  });

  it('define 只公开 typed token，不公开 author callback', () => {
    const capture = vi.fn((input: number) => ({ value: input }));
    const definition = defineRuntimeOwner({
      key: 'private-callbacks',
      value: { capture, read: value => value.value, equals: (left, right) => left.value === right.value },
    });

    expect(definition).toEqual({ key: 'private-callbacks' });
    expect(definition).not.toHaveProperty('value');
    expectTypeOf(definition).not.toHaveProperty('value');
    expect(capture).not.toHaveBeenCalled();
  });

  it('Core、Tier 2 与 custom owner 复用同一 registry，不引入领域分支', () => {
    const registry = createRuntimeOwnerRegistry({
      builtins: [defineNumberOwner('@retikz/core')],
      custom: [defineNumberOwner('@retikz/plot'), defineNumberOwner('custom-extension')],
    });

    expect(registry.definitions().map(definition => definition.key)).toEqual([
      '@retikz/core',
      '@retikz/plot',
      'custom-extension',
    ]);
  });

  it('define 拒绝空 owner key', () => {
    expect(() => defineNumberOwner('')).toThrowError(expect.objectContaining({ code: 'RUNTIME_OWNER_TOKEN_INVALID' }));
  });

  it('registry 对无效 JavaScript input 返回稳定 token error', () => {
    expect(() =>
      createRuntimeOwnerRegistry(null as unknown as Parameters<typeof createRuntimeOwnerRegistry>[0]),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_OWNER_TOKEN_INVALID' }));
  });
});
