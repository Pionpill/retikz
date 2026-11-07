import { describe, expect, it } from 'vitest';

import {
  comparePropertyPaths,
  encodePropertyPath,
  formatPropertyPath,
  hasPropertyPathPrefix,
  isPropertyPathEqual,
  readPropertyPath,
} from '../src';

describe('属性路径', () => {
  it('读取根、自身属性和数组元素，并拒绝错误容器类型及继承属性', () => {
    const root = { children: [{ 'a.b': { '': 42 } }], '2': 'property' };
    expect(readPropertyPath(root, [])).toBe(root);
    expect(readPropertyPath(root, ['children', 0, 'a.b', ''])).toBe(42);
    expect(readPropertyPath(root, ['2'])).toBe('property');
    expect(readPropertyPath(root, [2])).toBeUndefined();
    expect(readPropertyPath(root, ['children', '0'])).toBeUndefined();
    expect(readPropertyPath(root, ['toString'])).toBeUndefined();
    expect(readPropertyPath(root, ['children', -1])).toBeUndefined();
    expect(readPropertyPath(root, ['children', 0.5])).toBeUndefined();
    expect(readPropertyPath(root, ['missing', 'value'])).toBeUndefined();
  });

  it('格式化特殊属性名并为不同类型的路径生成不同索引', () => {
    expect(formatPropertyPath([])).toBe('$');
    expect(formatPropertyPath(['children', 2, 'id'])).toBe('children[2].id');
    expect(formatPropertyPath(['a.b', 'x"y', '', '2'])).toBe('["a.b"]["x\\"y"][""]["2"]');
    expect(encodePropertyPath(['a.b'])).not.toBe(encodePropertyPath(['a', 'b']));
    expect(encodePropertyPath([2])).not.toBe(encodePropertyPath(['2']));
  });

  it('按内容和段类型比较，父路径优先且数字按数值排序', () => {
    expect(isPropertyPathEqual(['children', 2], ['children', 2])).toBe(true);
    expect(isPropertyPathEqual(['children', 2], ['children', '2'])).toBe(false);
    expect(hasPropertyPathPrefix(['children', 2, 'id'], ['children', 2])).toBe(true);
    expect(hasPropertyPathPrefix(['children', 20], ['children', 2])).toBe(false);
    expect(comparePropertyPaths(['children', 2], ['children', 10])).toBeLessThan(0);
    expect(comparePropertyPaths(['children', 2], ['children', 2, 'id'])).toBeLessThan(0);
  });
});
