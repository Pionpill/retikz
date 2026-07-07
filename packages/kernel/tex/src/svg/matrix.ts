/**
 * 2D 仿射矩阵（SVG `[a,b,c,d,e,f]` 约定：`x' = a·x + c·y + e`，`y' = b·x + d·y + f`）
 * @description 用于把 MathJax SVG 嵌套 `<g transform>` 累积成「根 → 字形」的世界变换，再作用到 path 坐标。
 */
export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** 矩阵相乘 `A·B`（先 B 后 A 的坐标语义）；下降子树时 `childAccum = multiply(parentAccum, local)` */
export const multiply = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];

/** 把点经矩阵变换 */
export const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

/**
 * 解析 SVG `transform` 属性值为单一矩阵（支持 translate / scale / matrix，按出现顺序左乘累积）
 * @description MathJax SVG 仅用 `scale(1,-1)`（全局 y 翻转）+ `translate(x,y)`（字形偏移）；matrix 一并支持兜底。
 *   无 / 空 → 单位阵。未知函数或 malformed 参数会抛错，由上层降级为 null，避免静默错位。
 */
export const parseTransform = (value: string | undefined): Matrix => {
  const source = value?.trim();
  if (!source) return IDENTITY;
  let m: Matrix = IDENTITY;
  const re = /([a-zA-Z][\w-]*)\s*\(([^)]*)\)/g;
  let hit: RegExpExecArray | null;
  let cursor = 0;
  while ((hit = re.exec(source)) !== null) {
    if (source.slice(cursor, hit.index).trim().length > 0) {
      throw new Error(`Unsupported SVG transform syntax: ${source}`);
    }
    const fn = hit[1];
    const args = hit[2]
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(Number);
    if (args.some(arg => !Number.isFinite(arg))) {
      throw new Error(`Invalid SVG transform argument: ${hit[0]}`);
    }
    let local: Matrix;
    if (fn === 'translate') {
      if (args.length < 1 || args.length > 2) throw new Error(`Invalid translate transform: ${hit[0]}`);
      local = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
    } else if (fn === 'scale') {
      if (args.length < 1 || args.length > 2) throw new Error(`Invalid scale transform: ${hit[0]}`);
      const sx = args[0] ?? 1;
      local = [sx, 0, 0, args[1] ?? sx, 0, 0];
    } else if (fn === 'matrix') {
      if (args.length !== 6) throw new Error(`Invalid matrix transform: ${hit[0]}`);
      local = [args[0], args[1], args[2], args[3], args[4], args[5]];
    } else {
      throw new Error(`Unsupported SVG transform: ${fn}`);
    }
    m = multiply(m, local);
    cursor = re.lastIndex;
  }
  if (source.slice(cursor).trim().length > 0) {
    throw new Error(`Unsupported SVG transform syntax: ${source}`);
  }
  return m;
};
