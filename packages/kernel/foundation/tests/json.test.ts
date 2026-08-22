import { cloneAndFreezeJson, RetikzError, RetikzFoundationError, RetikzFoundationErrorCode } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('cloneAndFreezeJson', () => {
  it('returns a detached deeply frozen JSON tree', () => {
    const input: { nested: { label: string }; values: [number, { enabled: boolean }] } = {
      nested: { label: 'before' },
      values: [1, { enabled: true }],
    };

    const output = cloneAndFreezeJson(input, 'payload');
    input.nested.label = 'after';
    input.values[1].enabled = false;

    expect(output).toEqual({ nested: { label: 'before' }, values: [1, { enabled: true }] });
    expect(Object.getPrototypeOf(output)).toBeNull();
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.nested)).toBe(true);
    expect(Object.isFrozen(output.values)).toBe(true);
    expect(Object.isFrozen(output.values[1])).toBe(true);
  });

  it('accepts null-prototype objects and shared references by cloning each branch', () => {
    const shared = { value: 'shared' };
    const input = Object.assign(Object.create(null), { first: shared, second: shared });

    const output = cloneAndFreezeJson(input);

    expect(output.first).toEqual({ value: 'shared' });
    expect(output.first).not.toBe(output.second);
  });

  it.each([
    ['non-finite number', Number.NaN],
    ['undefined', undefined],
    ['function', () => 'value'],
    ['bigint', BigInt(1)],
  ])('rejects %s', (_label, value) => {
    expect(() => cloneAndFreezeJson(value, 'payload')).toThrowError(RetikzFoundationError);
    expect(() => cloneAndFreezeJson(value, 'payload')).toThrowError(/payload/);
  });

  it('rejects cycles, sparse arrays, symbol keys, accessors, and class instances', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const sparse = [] as Array<unknown>;
    sparse.length = 1;
    const symbolKey = { [Symbol('key')]: true };
    const accessor = Object.defineProperty({}, 'value', { enumerable: true, get: () => true });
    const classInstance = new (class Demo {})();

    for (const value of [cyclic, sparse, symbolKey, accessor, classInstance]) {
      expect(() => cloneAndFreezeJson(value, 'payload')).toThrowError(RetikzFoundationError);
    }
  });

  it('classifies invalid JSON data with a stable code and path detail', () => {
    let failure: unknown;
    try {
      cloneAndFreezeJson({ nested: Number.POSITIVE_INFINITY }, 'payload');
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(RetikzError);
    expect(failure).toMatchObject({
      code: RetikzFoundationErrorCode.Json,
      details: { path: 'payload.nested' },
      cause: Number.POSITIVE_INFINITY,
    });
    expect((failure as RetikzFoundationError).message).toBe('payload.nested must contain only finite JSON numbers');
  });
});
