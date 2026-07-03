/**
 * 格式化 IR JSON
 * @description `JSON.stringify(_, null, 2)` 会把 `[0, 0]` 这种短数组拆 4 行；post-process 把不含嵌套的纯标量短数组压回单行（限 60 字符内，避免长数组内联反而难读）。
 */
export const formatIR = (ir: unknown): string =>
  JSON.stringify(ir, null, 2).replace(/\[\s*([^[\]{}]+?)\s*\]/g, (match, contents: string) => {
    const inlined = `[${contents
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim()}]`;
    return inlined.length <= 60 ? inlined : match;
  });
