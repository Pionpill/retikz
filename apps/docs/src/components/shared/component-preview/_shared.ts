/** ComponentPreview 套件内部共享：类型、对齐 class 表、IR 格式化 */

export type Transform = { x: number; y: number; scale: number };

/** 源码视图切换：React 源码 / IR JSON */
export type SourceView = 'react' | 'ir';

export const alignClass = {
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
} as const;

export type AlignKey = keyof typeof alignClass;

/**
 * 预览区高度档位——mobile / sm: 双断点。`md` 与改造前 `h-56 sm:h-72` 完全一致，作为默认值。
 * 叙述性插图（hideCode + retikz 配图）一般用 xs / sm；带交互的大型 demo 用 lg / xl。
 */
export const sizeClass = {
  xs: 'h-32 sm:h-40',
  sm: 'h-44 sm:h-56',
  md: 'h-56 sm:h-72',
  lg: 'h-72 sm:h-96',
  xl: 'h-96 sm:h-[28rem]',
} as const;

export type SizeKey = keyof typeof sizeClass;

/**
 * `JSON.stringify(_, null, 2)` 会把数组无脑拆成 4 行（`position: [0, 0]` 也变 4 行），
 * IR 输出特别冗长。post-process：把不含嵌套对象/数组的纯标量短数组压回单行（限 60 字符以内
 * 避免长数组内联反而难读）。
 */
export const formatIR = (ir: unknown): string =>
  JSON.stringify(ir, null, 2).replace(/\[\s*([^[\]{}]+?)\s*\]/g, (match, contents: string) => {
    const inlined = `[${contents
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim()}]`;
    return inlined.length <= 60 ? inlined : match;
  });
