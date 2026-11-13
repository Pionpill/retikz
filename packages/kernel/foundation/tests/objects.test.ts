import { compareProperties, mergeDefinedProperties, mergeProperties, RetikzFoundationError } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('compareProperties', () => {
  it('默认展开一层，深度边界保留引用比较', () => {
    const left = Object.freeze({ child: Object.freeze({ value: 1 }) });
    const right = Object.freeze({ child: Object.freeze({ value: 1 }) });
    expect(compareProperties(left, right)).toBe(false);
    expect(compareProperties(left, right, {})).toBe(false);
    expect(compareProperties(left, right, { depth: 2 })).toBe(true);
    expect(compareProperties(left.child, right.child)).toBe(true);
    expect(compareProperties(left.child, right.child, { depth: 0 })).toBe(false);
    expect(compareProperties(left, left, { depth: 0 })).toBe(true);
    expect(compareProperties(left, { child: { value: 2 } }, { depth: 2 })).toBe(false);
    expect(compareProperties({ child: left.child }, { child: left.child })).toBe(true);
  });

  it('原始值遵循 Object.is，不进行类型转换', () => {
    expect(compareProperties(NaN, NaN)).toBe(true);
    expect(compareProperties(0, -0)).toBe(false);
    expect(compareProperties({ value: 0 }, { value: -0 })).toBe(false);
    expect(compareProperties(1, '1')).toBe(false);
    expect(compareProperties(null, undefined)).toBe(false);
    expect(compareProperties(null, {})).toBe(false);
    expect(compareProperties(undefined, undefined)).toBe(true);
  });

  it('比较可枚举字符串和 symbol 属性，忽略插入顺序与隐藏属性', () => {
    const key = Symbol('key');
    const left = { a: 1, [key]: 2 };
    const right = { [key]: 2, a: 1 };
    Object.defineProperty(left, 'hidden', { value: 3 });
    expect(compareProperties(left, right)).toBe(true);
    expect(compareProperties(left, { a: 1, [key]: 3 })).toBe(false);
    expect(compareProperties(left, { a: 1, [Symbol('key')]: 2 })).toBe(false);
    expect(compareProperties({ a: undefined }, {})).toBe(false);
    expect(compareProperties({ a: 1 }, { b: 1 })).toBe(false);
    expect(compareProperties(Object.assign(Object.create(null), { a: 1 }), { a: 1 })).toBe(true);
  });

  it('数组比较长度、空位与额外属性，不能与普通对象混同', () => {
    expect(compareProperties([1, 2], [1, 2])).toBe(true);
    expect(compareProperties([1, 2], [2, 1])).toBe(false);
    expect(compareProperties(new Array(1), new Array(2))).toBe(false);
    expect(compareProperties(new Array(1), [undefined])).toBe(false);
    expect(compareProperties(new Array(2), new Array(2))).toBe(true);
    expect(compareProperties([], {})).toBe(false);
    expect(compareProperties([{ value: 1 }], [{ value: 1 }])).toBe(false);
    expect(compareProperties([{ value: 1 }], [{ value: 1 }], { depth: 2 })).toBe(true);
    expect(compareProperties(Object.assign([1], { label: 'a' }), Object.assign([1], { label: 'b' }))).toBe(false);
  });

  it('非普通实例与函数仅按引用比较，不把无枚举属性误判为相等', () => {
    class Value {
      value = 1;
    }
    for (const [left, right] of [
      [new Date(0), new Date(0)],
      [new Map(), new Map()],
      [new Set(), new Set()],
      [new Value(), new Value()],
      [() => 1, () => 1],
    ]) {
      expect(compareProperties(left, right, { depth: 2 })).toBe(false);
      expect(compareProperties(left, left, { depth: 2 })).toBe(true);
    }
  });

  it('循环引用受深度边界约束，不进行无限递归', () => {
    const left: { next?: object } = {};
    const right: { next?: object } = {};
    left.next = left;
    right.next = right;
    expect(compareProperties(left, right, { depth: 3 })).toBe(false);
    expect(compareProperties(left, left, { depth: 3 })).toBe(true);
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('拒绝无效深度 %s', depth => {
    expect(() => compareProperties(1, 1, { depth })).toThrow(RetikzFoundationError);
  });

  it('只读取遍历到的属性，并保留访问器失败的原始原因', () => {
    let reads = 0;
    const left = {
      get value() {
        reads++;
        return 1;
      },
    };
    expect(compareProperties(left, { value: 1 }, { depth: 0 })).toBe(false);
    expect(reads).toBe(0);
    expect(compareProperties(left, { value: 1 })).toBe(true);
    expect(reads).toBe(1);
    const cause = new Error('getter failed');
    const failing = {
      get value(): number {
        throw cause;
      },
    };
    expect(() => compareProperties(failing, { value: 1 })).toThrow(RetikzFoundationError);
    try {
      compareProperties(failing, { value: 1 });
    } catch (error) {
      expect(error).toMatchObject({ cause });
    }
  });
});

describe('mergeDefinedProperties', () => {
  it('跳过 undefined 源和属性，同时保留其余有效值与浅引用', () => {
    const nested = { color: 'red' };
    const parent = Object.freeze({ enabled: true, count: 2, label: 'base', nullable: 'value', nested });
    const result = mergeDefinedProperties<{
      enabled?: boolean;
      count?: number;
      label?: string;
      nullable?: string | null;
      absent?: string;
      nested?: typeof nested;
    }>([
      parent,
      undefined,
      { enabled: false, count: 0, label: '', nullable: null, absent: undefined },
      { count: undefined },
    ]);
    expect(result).toEqual({ enabled: false, count: 0, label: '', nullable: null, nested });
    expect(Object.hasOwn(result, 'absent')).toBe(false);
    expect(result.nested).toBe(nested);
    expect(parent.count).toBe(2);
    expect(mergeDefinedProperties([])).toEqual({});
    expect(mergeDefinedProperties([undefined])).toEqual({});
  });
});

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
