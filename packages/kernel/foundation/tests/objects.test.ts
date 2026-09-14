import { mergeProperties, RetikzFoundationError } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('mergeProperties', () => {
  it('merges any number of layers in order, including explicit undefined and null', () => {
    const result = mergeProperties<{ enabled?: boolean; count?: number; label?: string | null }>([
      { enabled: true, count: 2, label: 'base' },
      undefined,
      { enabled: false, count: 0, label: '' },
      { label: null },
      { count: undefined },
    ]);
    expect(result).toEqual({ enabled: false, count: undefined, label: null });
    expect(Object.hasOwn(result, 'count')).toBe(true);
    expect(mergeProperties([])).toEqual({});
    expect(mergeProperties([undefined])).toEqual({});
  });

  it('applies the configured predicate to first writes and overrides without deleting existing values', () => {
    const sources: Array<{ count: number; label: string | null; absent?: string }> = [
      { count: 3, label: 'base', absent: undefined },
      { count: 0, label: null },
    ];
    expect(mergeProperties(sources, { shouldOverride: value => value !== undefined })).toEqual({
      count: 0,
      label: null,
    });
    expect(mergeProperties(sources, { shouldOverride: value => value !== undefined && value !== null })).toEqual({
      count: 0,
      label: 'base',
    });
    expect(mergeProperties(sources, { shouldOverride: (_value, key) => key === 'count' })).toEqual({ count: 0 });
    expect(mergeProperties(sources, { shouldOverride: () => false })).toEqual({});
  });

  it('preserves shallow references and leaves frozen inputs untouched', () => {
    const nested = { color: 'red' };
    const source = Object.freeze({ nested, list: [1, 2] });
    const result = mergeProperties([source]);
    expect(result).not.toBe(source);
    expect(result.nested).toBe(nested);
    expect(result.list).toBe(source.list);
    expect(source).toEqual({ nested: { color: 'red' }, list: [1, 2] });
    const replacement = { color: 'blue' };
    expect(mergeProperties([source, { ...source, nested: replacement }]).nested).toBe(replacement);
  });

  it('copies enumerable string and symbol properties, excluding inherited and hidden properties', () => {
    const symbol = Symbol('option');
    class Source {
      own = 1;
      [symbol] = 2;
      get inherited() {
        return 3;
      }
    }
    const source = new Source();
    Object.defineProperty(source, 'hidden', { value: 4 });
    expect(Reflect.ownKeys(mergeProperties([source]))).toEqual(['own', symbol]);
  });

  it('creates data properties for special keys without changing the output prototype', () => {
    const source = Object.fromEntries([
      ['__proto__', { injected: true }],
      ['constructor', 'value'],
    ]);
    const result = mergeProperties<Record<string, unknown>>([source]);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(result['__proto__']).toEqual({ injected: true });
    expect(result['constructor']).toBe('value');
  });

  it('reads enumerable accessors once and preserves property-read failures as the cause', () => {
    let reads = 0;
    const source = {
      get count() {
        reads += 1;
        return 4;
      },
    };
    expect(mergeProperties([source])).toEqual({ count: 4 });
    expect(reads).toBe(1);
    const cause = new Error('read failed');
    const failingSource = {
      get count(): number {
        throw cause;
      },
    };
    expect(() => mergeProperties([failingSource])).toThrow(RetikzFoundationError);
    try {
      mergeProperties([failingSource]);
    } catch (error) {
      expect(error).toMatchObject({ cause });
    }
  });

  it('preserves callback failures as the cause of a Foundation error', () => {
    const cause = new Error('filter failed');
    expect(() =>
      mergeProperties([{ count: 1 }], {
        shouldOverride: () => {
          throw cause;
        },
      }),
    ).toThrow(RetikzFoundationError);
    try {
      mergeProperties([{ count: 1 }], {
        shouldOverride: () => {
          throw cause;
        },
      });
    } catch (error) {
      expect(error).toMatchObject({ cause });
    }
  });
});
