import type { AlignKey, SizeKey, SourceView } from './types';

/** 视图展示顺序（toggle 按这个顺序渲染可用视图）：vanilla 夹在 react 与 ir 之间。 */
export const SOURCE_VIEW_ORDER: ReadonlyArray<SourceView> = ['react', 'vanilla', 'ir'];

/** 渲染区垂直对齐 class。 */
export const alignClass: Record<AlignKey, string> = {
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
};

/**
 * 预览区高度档位 class
 * @description 高度 class 一律写字面量（不动态拼字符串），保证 Tailwind JIT 能静态扫到。
 */
export const sizeClass: Record<SizeKey, string> = {
  xs: 'h-32 sm:h-40',
  sm: 'h-44 sm:h-56',
  md: 'h-56 sm:h-72',
  lg: 'h-72 sm:h-96',
  xl: 'h-96 sm:h-[28rem]',
  xxl: 'h-[28rem] sm:h-[32rem]',
  xxxl: 'h-[32rem] sm:h-[40rem]',
};

/** size 档位的展示顺序（从小到大）；切换 UI 按这个数组渲染。 */
export const SIZE_KEYS: ReadonlyArray<SizeKey> = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
