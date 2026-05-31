import { describe, expect, it } from 'vitest';

import { availableSourceViews } from '../src/components/shared/component-preview/_shared';

describe('availableSourceViews：react/ir/vanilla 三者全可选，只显示对应选项', () => {
  it('全有 → 三视图按固定顺序', () => {
    expect(availableSourceViews({ react: true, ir: true, vanilla: true })).toEqual(['react', 'ir', 'vanilla']);
  });

  it('全无 → 空（不渲染代码面板）', () => {
    expect(availableSourceViews({ react: false, ir: false, vanilla: false })).toEqual([]);
  });

  it('单视图 → 只返回那一个（调用方据此不出 toggle）', () => {
    expect(availableSourceViews({ react: false, ir: true, vanilla: false })).toEqual(['ir']);
    expect(availableSourceViews({ react: false, ir: false, vanilla: true })).toEqual(['vanilla']);
    expect(availableSourceViews({ react: true, ir: false, vanilla: false })).toEqual(['react']);
  });

  it('部分组合 → 保持固定顺序、跳过缺省项', () => {
    // RetikzPreview 实际场景：react + ir（无 vanilla）
    expect(availableSourceViews({ react: true, ir: true, vanilla: false })).toEqual(['react', 'ir']);
    // react + vanilla（无 ir）
    expect(availableSourceViews({ react: true, ir: false, vanilla: true })).toEqual(['react', 'vanilla']);
    // ir + vanilla（无 react）
    expect(availableSourceViews({ react: false, ir: true, vanilla: true })).toEqual(['ir', 'vanilla']);
  });
});
