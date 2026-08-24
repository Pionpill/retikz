import {
  assertPlainDataContainers,
  cloneAndFreezeJson,
  RetikzError,
  RetikzFoundationError,
  RetikzFoundationErrorCode,
} from '@retikz/foundation';
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

describe('assertPlainDataContainers', () => {
  it('accepts plain containers while leaving primitive leaf validation to the caller', () => {
    const shared = { value: undefined };

    expect(() =>
      assertPlainDataContainers({ first: shared, second: shared, callback: () => true }, 'provider output'),
    ).not.toThrow();
  });

  it('rejects unsafe container structure without reading accessors', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const sparse = [] as Array<unknown>;
    sparse.length = 1;
    const arrayWithExtra = [true];
    Object.defineProperty(arrayWithExtra, 'extra', { enumerable: true, value: true });
    const symbolKey = { [Symbol('key')]: true };
    let getterReadCount = 0;
    const accessor = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: () => {
        getterReadCount += 1;
        return true;
      },
    });
    const hidden = Object.defineProperty({}, 'hidden', { value: true });
    const classInstance = new (class Demo {})();

    for (const value of [cyclic, sparse, arrayWithExtra, symbolKey, accessor, hidden, classInstance, new Date(0)]) {
      expect(() => assertPlainDataContainers(value, 'provider output')).toThrowError(RetikzFoundationError);
    }
    expect(getterReadCount).toBe(0);
  });

  it('rejects Array subclasses as non-plain containers', () => {
    class ArraySubclass extends Array<string> {}

    const value = new ArraySubclass('item');

    expect(() => assertPlainDataContainers(value, 'provider output')).toThrowError(RetikzFoundationError);
    expect(() => cloneAndFreezeJson(value, 'payload')).toThrowError(RetikzFoundationError);
  });
});
