import { describe, expect, it } from 'vitest';

import { mergeExternalDatasets, RetikzDataError } from '../../src';

describe('mergeExternalDatasets', () => {
  it('合并具名数据并保留共享行数组，不修改调用方字典', () => {
    const sales = [{ value: 1 }];
    const inventory = [{ value: 2 }];
    const first = Object.freeze({ sales });
    const merged = mergeExternalDatasets([first, { sales, inventory }]);

    expect(merged).toEqual({ sales, inventory });
    expect(merged.sales).toBe(sales);
    expect(merged.inventory).toBe(inventory);
    expect(first).toEqual({ sales });
  });

  it('拒绝同名但不同引用的行数组，即使内容相等', () => {
    expect(() => mergeExternalDatasets([{ sales: [{ value: 1 }] }, { sales: [{ value: 1 }] }])).toThrow(
      RetikzDataError,
    );
    expect(() => mergeExternalDatasets([{ sales: [] }, { sales: [] }])).toThrow(/sales.*conflicts by identity/);
  });

  it('支持空贡献与对象原型同名的数据引用', () => {
    const rows = [{ value: 1 }];
    const merged = mergeExternalDatasets([Object.fromEntries([['__proto__', rows]]), { constructor: rows }]);

    expect(mergeExternalDatasets([])).toEqual({});
    expect(Object.hasOwn(merged, '__proto__')).toBe(true);
    expect(merged['__proto__']).toBe(rows);
    expect(merged.constructor).toBe(rows);
  });
});
