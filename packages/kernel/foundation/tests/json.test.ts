import {
  assertPlainDataContainers,
  cloneAndFreezeJson,
  jsonStructuralEquals,
  RetikzError,
  RetikzFoundationError,
  RetikzFoundationErrorCode,
} from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('jsonStructuralEquals', () => {
  it('独立于属性插入顺序比较嵌套对象，无需更改输入', () => {
    const left = cloneAndFreezeJson({ filters: [{ field: 'age', value: 18 }], enabled: true });
    const right = cloneAndFreezeJson({ enabled: true, filters: [{ value: 18, field: 'age' }] });
    expect(jsonStructuralEquals(left, right)).toBe(true);
    expect(jsonStructuralEquals(right, left)).toBe(true);
    expect(jsonStructuralEquals(left, left)).toBe(true);
    expect(left.filters[0]).toEqual({ field: 'age', value: 18 });
    expect(right.filters[0]).toEqual({ value: 18, field: 'age' });
  });

  it.each([
    [{ a: 1 }, { a: 1, b: 2 }],
    [{ a: 1 }, { b: 1 }],
    [{ nested: { value: 1 } }, { nested: { value: 2 } }],
    [
      [1, 2],
      [2, 1],
    ],
    [[1], [1, 2]],
    [[1], { 0: 1 }],
    [null, {}],
    [1, '1'],
    [false, 0],
    [0, -0],
  ])('区分不同的结构或值：%j 与 %j', (left, right) => {
    expect(jsonStructuralEquals(left, right)).toBe(false);
    expect(jsonStructuralEquals(right, left)).toBe(false);
  });

  it.each([null, true, false, '', 'value', 0, -0, 1.5, [], {}])('比较相等的 JSON 值：%j', value => {
    expect(jsonStructuralEquals(value, cloneAndFreezeJson(value))).toBe(true);
  });
});

describe('cloneAndFreezeJson', () => {
  it('返回分离的深度冻结的 JSON 树', () => {
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

  it('通过克隆每个分支来接受空原型对象和共享引用', () => {
    const shared = { nested: { value: 'shared' } };
    const input = Object.assign(Object.create(null), { first: shared, second: shared });

    const output = cloneAndFreezeJson(input);

    expect(output.first).toEqual({ nested: { value: 'shared' } });
    expect(output.first).not.toBe(output.second);
    expect(output.first.nested).not.toBe(output.second.nested);
  });

  it('将原型相关的属性名称复制为冻结自己的数据，而不更改输出原型', () => {
    const input = JSON.parse('{"__proto__":{"value":1},"constructor":"data","toString":2}');
    const output = cloneAndFreezeJson(input);
    expect(Object.getPrototypeOf(output)).toBeNull();
    expect(Object.keys(output)).toEqual(['__proto__', 'constructor', 'toString']);
    expect(Object.getOwnPropertyDescriptor(output, '__proto__')).toMatchObject({
      enumerable: true,
      writable: false,
      configurable: false,
      value: { value: 1 },
    });
    expect(output.constructor).toBe('data');
    expect(output.toString).toBe(2);
    expect(Object.getPrototypeOf(output.__proto__)).toBeNull();
    expect(Object.isFrozen(output.__proto__)).toBe(true);
    expect(output.__proto__).not.toBe(input.__proto__);
  });

  it.each([
    ['non-finite number', Number.NaN],
    ['undefined', undefined],
    ['function', () => 'value'],
    ['bigint', BigInt(1)],
  ])('拒绝 %s', (_label, value) => {
    expect(() => cloneAndFreezeJson(value, 'payload')).toThrowError(RetikzFoundationError);
    expect(() => cloneAndFreezeJson(value, 'payload')).toThrowError(/payload/);
  });

  it('拒绝循环、稀疏数组、符号键、访问器和类实例', () => {
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

  it('使用稳定的代码和路径详细信息对无效的 JSON 数据进行分类', () => {
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

  it('在访问有效的兄弟分支后保留嵌套的错误路径', () => {
    const input = { items: [{ value: 1 }, { value: Infinity }] };
    let failure: unknown;
    try {
      cloneAndFreezeJson(input, 'payload');
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      code: RetikzFoundationErrorCode.Json,
      details: { path: 'payload.items[1].value' },
      message: 'payload.items[1].value must contain only finite JSON numbers',
      cause: Infinity,
    });
    expect(cloneAndFreezeJson({ items: [null, true, 'text', 0] })).toEqual({ items: [null, true, 'text', 0] });
  });

  it.each([undefined, () => true, BigInt(1), Symbol('value'), NaN])(
    '拒绝数组和对象中无效的嵌套叶',
    value => {
      for (const input of [[value], { value }]) {
        expect(() => cloneAndFreezeJson(input, 'payload')).toThrowError(RetikzFoundationError);
      }
    },
  );

  it('拒绝嵌套访问器而不评估它们并保留描述符错误路径', () => {
    let reads = 0;
    const item = Object.defineProperty({}, 'secret', { enumerable: true, get: () => ++reads });
    const input = { items: [{ value: 1 }, item] };
    for (const inspect of [cloneAndFreezeJson, assertPlainDataContainers]) {
      let failure: unknown;
      try {
        inspect(input, 'payload');
      } catch (error) {
        failure = error;
      }
      if (!(failure instanceof RetikzFoundationError)) throw new Error('Expected Foundation error');
      expect(failure.details).toEqual({ path: 'payload.items[1].secret' });
      expect(failure.message).toBe('payload.items[1].secret must be an enumerable JSON data property');
      expect(failure.cause).toBe(item);
    }
    expect(reads).toBe(0);
  });
});

describe('assertPlainDataContainers', () => {
  it('接受普通容器，同时将原始叶验证留给调用者', () => {
    const shared = { value: undefined };

    expect(() =>
      assertPlainDataContainers({ first: shared, second: shared, callback: () => true }, 'provider output'),
    ).not.toThrow();
  });

  it('拒绝不安全的容器结构而不读取访问器', () => {
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

  it('拒绝 Array 子类作为非普通容器', () => {
    class ArraySubclass extends Array<string> {}

    const value = new ArraySubclass('item');

    expect(() => assertPlainDataContainers(value, 'provider output')).toThrowError(RetikzFoundationError);
    expect(() => cloneAndFreezeJson(value, 'payload')).toThrowError(RetikzFoundationError);
  });
});
