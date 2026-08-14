import type { InputEmbedAdapter } from '@retikz/vanilla';

import { describe, expect, it } from 'vitest';

import { isEmbeddableMarked, resolveInputEmbedAdapter } from '../../../src';

const makeAdapter = (kind: string): InputEmbedAdapter => ({
  kind,
  lower: () => ({
    node: { type: 'node', id: 'n', position: [0, 0] },
    compositeDependencies: { roots: [], providers: [] },
  }),
});

/** 构造一个带可嵌入静态标记的 FC-like 函数 */
const markedComponent = (displayName: string, adapter?: InputEmbedAdapter) => {
  const fn = () => null;
  fn.displayName = displayName;
  Object.assign(fn, { isTier2Embeddable: true, inputEmbedAdapter: adapter });
  return fn;
};

describe('resolveInputEmbedAdapter', () => {
  it('标记组件返回静态 Vanilla InputEmbedAdapter', () => {
    const adapter = makeAdapter('demo.adapter');
    const fn = markedComponent('dn', adapter);
    expect(resolveInputEmbedAdapter(fn)).toBe(adapter);
  });

  it('已标记但缺 inputEmbedAdapter → fail-loud throw（含组件名）', () => {
    const fn = markedComponent('MyChart', undefined);
    expect(() => resolveInputEmbedAdapter(fn)).toThrow(/MyChart/);
  });

  it('未标记普通函数 → 返回 null', () => {
    const fn = () => null;
    expect(resolveInputEmbedAdapter(fn)).toBeNull();
  });

  it('非函数 type（字符串 / 普通对象）→ 返回 null', () => {
    expect(resolveInputEmbedAdapter('div')).toBeNull();
    expect(resolveInputEmbedAdapter({})).toBeNull();
  });
});

describe('isEmbeddableMarked', () => {
  it('标记组件 → true', () => {
    expect(isEmbeddableMarked(markedComponent('dn', makeAdapter('demo.adapter')))).toBe(true);
  });

  it('未标记函数 / 非函数 → false', () => {
    expect(isEmbeddableMarked(() => null)).toBe(false);
    expect(isEmbeddableMarked('div')).toBe(false);
    expect(isEmbeddableMarked({})).toBe(false);
    expect(isEmbeddableMarked(undefined)).toBe(false);
  });
});
