import type { CSSProperties } from 'react';

import type { AlignKey, SizeKey, SourceView } from './types';

/** 预览画布周围空白区域的点阵背景 */
export const DOT_PATTERN_STYLE: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklab, var(--foreground) 15%, transparent) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
};

/** 视图展示顺序（toggle 按这个顺序渲染可用视图）：vanilla 夹在 react 与 ir 之间。 */
export const SOURCE_VIEW_ORDER: ReadonlyArray<SourceView> = ['react', 'vanilla', 'ir', 'config'];

/** 渲染区垂直对齐 class。 */
export const alignClass: Record<AlignKey, string> = {
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
};

/**
 * 预览区高度档位 class，包含上下各 20px 留白
 * @description 高度 class 一律写字面量（不动态拼字符串），保证 Tailwind JIT 能静态扫到。
 */
export const sizeClass: Record<SizeKey, string> = {
  xs: 'h-30',
  sm: 'h-42 sm:h-46',
  md: 'h-54 sm:h-62',
  lg: 'h-70 sm:h-86',
  xl: 'h-94 sm:h-102',
  xxl: 'h-110 sm:h-118',
  xxxl: 'h-126 sm:h-150',
};

/** size 档位的展示顺序（从小到大）；切换 UI 按这个数组渲染。 */
export const SIZE_KEYS: ReadonlyArray<SizeKey> = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
