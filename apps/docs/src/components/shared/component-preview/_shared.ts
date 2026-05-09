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
