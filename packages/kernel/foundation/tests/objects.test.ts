import { mergeProperties, RetikzFoundationError } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('mergeProperties', () => {
  it('按顺序合并任意数量的层，包括显式 undefined 和空', () => {
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

  it('将配置的谓词应用于首次写入和覆盖，而不删除现有值', () => {
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

  it('保留浅引用并保持冻结输入不变', () => {
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

  it('复制可枚举字符串和符号属性，不包括继承和隐藏属性', () => {
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

  it('在不更改输出原型的情况下为特殊键创建数据属性', () => {
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

  it('读取可枚举访问器一次并将属性读取失败保留为原因', () => {
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

  it('保留回调失败作为 Foundation 错误的原因', () => {
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
