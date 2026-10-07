import { describe, expect, it, vi } from 'vitest';

import type { RuntimeSourceDefinition } from '../../src';
import { createRuntimeSourceRegistry, defineRuntimeSource, RetikzRuntimeErrorCode } from '../../src';

const defineNumberSource = (key: string) =>
  defineRuntimeSource<number, Readonly<{ value: number }>, number, Readonly<{ delta: number }>>({
    key,
    value: {
      capture: input => Object.freeze({ value: input }),
      read: value => value.value,
      equals: (left, right) => left.value === right.value,
    },
  });

describe('runtime source registry', () => {
  it('统一注册不同值类型的来源并保留 typed token', () => {
    const builtin = defineNumberSource('builtin');
    const custom = defineRuntimeSource<string, string, string, never>({
      key: 'custom',
      value: { capture: input => input, read: value => value, equals: (left, right) => left === right },
    });
    const registry = createRuntimeSourceRegistry([builtin, custom]);

    expect(registry.resolve(builtin)).toBe(builtin);
    expect(registry.resolve(custom)).toBe(custom);
    expect(registry.find('builtin')).toBe(builtin);
  });

  it('按 key code-unit 顺序返回 immutable definitions copy', () => {
    const b = defineNumberSource('b');
    const upper = defineNumberSource('A');
    const a = defineNumberSource('a');
    const registry = createRuntimeSourceRegistry([upper, b, a]);

    expect(registry.definitions().map(definition => definition.key)).toEqual(['A', 'a', 'b']);
    expect(Object.isFrozen(registry.definitions())).toBe(true);
    expect(registry.definitions()).not.toBe(registry.definitions());
  });

  it('拒绝来源数组中的重复 key，不采用覆盖优先级', () => {
    expect(() => createRuntimeSourceRegistry([defineNumberSource('same'), defineNumberSource('same')])).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Duplicate, owner: 'same' }),
    );
  });

  it('拒绝未注册但合法的 Definition', () => {
    const registered = defineNumberSource('registered');
    const unknown = defineNumberSource('unknown');
    const registry = createRuntimeSourceRegistry([registered]);

    expect(() => registry.resolve(unknown)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Unknown, owner: 'unknown' }),
    );
    expect(registry.find('unknown')).toBeUndefined();
  });

  it('以 object identity guard 拒绝结构伪造和 clone token', () => {
    const definition = defineNumberSource('owner');
    const registry = createRuntimeSourceRegistry([definition]);
    const forged = { key: 'owner' } as RuntimeSourceDefinition<number, { value: number }, number, { delta: number }>;
    const cloned = structuredClone(definition) as RuntimeSourceDefinition<
      number,
      { value: number },
      number,
      { delta: number }
    >;

    expect(() => registry.resolve(forged)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.TokenInvalid, owner: 'owner' }),
    );
    expect(() => registry.resolve(cloned)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.TokenInvalid, owner: 'owner' }),
    );
  });

  it('拒绝另一 Runtime module instance 创建的 foreign token', async () => {
    vi.resetModules();
    const { defineRuntimeSource: defineForeignRuntimeSource } = await import('../../src/source/define');
    const foreign = defineForeignRuntimeSource<number, number, number, never>({
      key: 'foreign',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });

    expect(() => createRuntimeSourceRegistry([foreign])).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.TokenInvalid, owner: 'foreign' }),
    );
  });

  it('define 只公开 typed token，不公开 author callback', () => {
    const capture = vi.fn((input: number) => ({ value: input }));
    const definition = defineRuntimeSource({
      key: 'private-callbacks',
      value: { capture, read: value => value.value, equals: (left, right) => left.value === right.value },
    });

    expect(definition).toEqual({ key: 'private-callbacks' });
    expect(definition).not.toHaveProperty('value');
    expect(capture).not.toHaveBeenCalled();
  });

  it('Core、Tier 2 与 custom owner 复用同一 registry，不引入领域分支', () => {
    const registry = createRuntimeSourceRegistry([
      defineNumberSource('@retikz/core'),
      defineNumberSource('@retikz/plot'),
      defineNumberSource('custom-extension'),
    ]);

    expect(registry.definitions().map(definition => definition.key)).toEqual([
      '@retikz/core',
      '@retikz/plot',
      'custom-extension',
    ]);
  });

  it('define 拒绝空 owner key', () => {
    expect(() => defineNumberSource('')).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.TokenInvalid }),
    );
  });
});
