import { describe, expect, it } from 'vitest';
import type { EmbeddableContribution, EmbeddableTier2Adapter } from '../../src';
import { isEmbeddableMarked, resolveEmbeddableAdapter } from '../../src';

const makeContribution = (): EmbeddableContribution => ({
  node: { type: 'node', id: 'n', position: [0, 0] },
  datasets: {},
  makeComposites: () => [],
});

const makeAdapter = (displayName: string): EmbeddableTier2Adapter => ({
  displayName,
  namespace: 'x',
  contribute: () => makeContribution(),
});

/** 构造一个带可嵌入静态标记的 FC-like 函数 */
const markedComponent = (displayName: string, adapter?: EmbeddableTier2Adapter) => {
  const fn = () => null;
  fn.displayName = displayName;
  Object.assign(fn, { isTier2Embeddable: true, embeddableAdapter: adapter });
  return fn;
};

describe('resolveEmbeddableAdapter', () => {
  it('标记组件 + 无显式列表 → 返回静态 embeddableAdapter', () => {
    const adapter = makeAdapter('dn');
    const fn = markedComponent('dn', adapter);
    expect(resolveEmbeddableAdapter(fn, 'dn', undefined)).toBe(adapter);
  });

  it('显式 embeddables 按 displayName 覆盖静态 adapter', () => {
    const staticAdapter = makeAdapter('dn');
    const explicitAdapter = makeAdapter('dn');
    const fn = markedComponent('dn', staticAdapter);
    expect(resolveEmbeddableAdapter(fn, 'dn', [explicitAdapter])).toBe(explicitAdapter);
  });

  it('显式列表可解析未标记的普通函数（displayName 匹配）', () => {
    const explicitAdapter = makeAdapter('dn');
    const fn = () => null;
    expect(resolveEmbeddableAdapter(fn, 'dn', [explicitAdapter])).toBe(explicitAdapter);
  });

  it('已标记但缺 embeddableAdapter 且无显式匹配 → fail-loud throw（含组件名）', () => {
    const fn = markedComponent('MyChart', undefined);
    expect(() => resolveEmbeddableAdapter(fn, 'MyChart', undefined)).toThrow(/MyChart/);
  });

  it('未标记普通函数且无显式匹配 → 返回 null', () => {
    const fn = () => null;
    expect(resolveEmbeddableAdapter(fn, 'dn', undefined)).toBeNull();
  });

  it('非函数 type（字符串 / 普通对象）→ 返回 null', () => {
    expect(resolveEmbeddableAdapter('div', 'div', undefined)).toBeNull();
    expect(resolveEmbeddableAdapter({}, 'obj', undefined)).toBeNull();
  });
});

describe('isEmbeddableMarked', () => {
  it('标记组件 → true', () => {
    expect(isEmbeddableMarked(markedComponent('dn', makeAdapter('dn')))).toBe(true);
  });

  it('未标记函数 / 非函数 → false', () => {
    expect(isEmbeddableMarked(() => null)).toBe(false);
    expect(isEmbeddableMarked('div')).toBe(false);
    expect(isEmbeddableMarked({})).toBe(false);
    expect(isEmbeddableMarked(undefined)).toBe(false);
  });
});
