import { describe, expect, it } from 'vitest';

import {
  type ComponentRenderSource,
  availableSourceViews,
} from '../src/components/shared/component-preview/_shared';

/** 一个非空视图（有文件即「可用」） */
const filled: ComponentRenderSource['react'] = { files: [{ filename: 'f.ts', code: 'x', lang: 'ts' }] };
/** 空文件视图：视为不可用 */
const empty: ComponentRenderSource['react'] = { files: [] };

describe('availableSourceViews：react/ir/vanilla 三者全可选，只显示有文件的视图', () => {
  it('全有 → 三视图按固定顺序（vanilla 居中）', () => {
    expect(availableSourceViews({ react: filled, ir: filled, vanilla: filled })).toEqual(['react', 'vanilla', 'ir']);
  });

  it('全无（缺省 / 空文件）→ 空（不渲染代码面板）', () => {
    expect(availableSourceViews({})).toEqual([]);
    expect(availableSourceViews({ react: empty, ir: empty, vanilla: empty })).toEqual([]);
  });

  it('单视图 → 只返回那一个（调用方据此不出 toggle）', () => {
    expect(availableSourceViews({ ir: filled })).toEqual(['ir']);
    expect(availableSourceViews({ vanilla: filled })).toEqual(['vanilla']);
    expect(availableSourceViews({ react: filled })).toEqual(['react']);
  });

  it('部分组合 → 保持固定顺序、跳过缺省项', () => {
    // RetikzPreview 实际场景：react + ir（无 vanilla）
    expect(availableSourceViews({ react: filled, ir: filled })).toEqual(['react', 'ir']);
    // react + vanilla（无 ir）
    expect(availableSourceViews({ react: filled, vanilla: filled })).toEqual(['react', 'vanilla']);
    // ir + vanilla（无 react）：vanilla 在 ir 之前
    expect(availableSourceViews({ ir: filled, vanilla: filled })).toEqual(['vanilla', 'ir']);
  });
});
