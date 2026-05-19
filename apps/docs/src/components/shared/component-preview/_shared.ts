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
 * 预览区高度档位
 * @description mobile / sm 双断点；`md` 是默认值；叙述性插图用 xs / sm，带交互的大型 demo 用 lg / xl / xxl / xxxl。
 * 高度 class 一律写字面量（不动态拼字符串），保证 Tailwind JIT 能静态扫到
 */
export const sizeClass = {
  xs: 'h-32 sm:h-40',
  sm: 'h-44 sm:h-56',
  md: 'h-56 sm:h-72',
  lg: 'h-72 sm:h-96',
  xl: 'h-96 sm:h-[28rem]',
  xxl: 'h-[28rem] sm:h-[32rem]',
  xxxl: 'h-[32rem] sm:h-[40rem]',
} as const;

export type SizeKey = keyof typeof sizeClass;

/** size 档位的展示顺序（从小到大）；切换 UI 按这个数组渲染 */
export const SIZE_KEYS: ReadonlyArray<SizeKey> = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];

/**
 * 格式化 IR JSON
 * @description `JSON.stringify(_, null, 2)` 会把 `[0, 0]` 这种短数组拆 4 行；post-process 把不含嵌套的纯标量短数组压回单行（限 60 字符内，避免长数组内联反而难读）
 */
export const formatIR = (ir: unknown): string =>
  JSON.stringify(ir, null, 2).replace(/\[\s*([^[\]{}]+?)\s*\]/g, (match, contents: string) => {
    const inlined = `[${contents
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim()}]`;
    return inlined.length <= 60 ? inlined : match;
  });

/** unified diff 中单行的种类：未变 / 新增 / 删除 */
export type DiffLineKind = 'context' | 'added' | 'removed';

/**
 * unified diff 结果
 * @description `code` 是展示用的拼接源码（baseline 删除行交织进 current 后逐行 join '\n'），`lineKinds` 与 `code.split('\n')` 长度严格对齐；调用方按下标染色 + 加 `+`/`-` 行首字符
 */
export type UnifiedDiff = {
  code: string;
  lineKinds: ReadonlyArray<DiffLineKind>;
};

/**
 * Diff 展示模式
 * @description off = 不显示 diff（展示真实 current 源码）；full = 完整 unified（current + removed 交织）；added = 只显示新增 + context（≈ current 源码 + 新增行染色）；removed = 只显示删除 + context（≈ baseline 视角 + 删除行染色）
 */
export type DiffMode = 'off' | 'full' | 'added' | 'removed';

/**
 * 按 mode 过滤 unified diff
 * @description added → 丢掉 removed 行（剩 added + context）；removed → 丢掉 added 行（剩 removed + context）；full → 原样返回。'off' 不走这里，调用方应直接用 current 源码
 */
export const filterDiffByMode = (diff: UnifiedDiff, mode: Exclude<DiffMode, 'off'>): UnifiedDiff => {
  if (mode === 'full') return diff;
  const lines = diff.code.split('\n');
  const skipKind: DiffLineKind = mode === 'added' ? 'removed' : 'added';
  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  for (let i = 0; i < lines.length; i++) {
    if (diff.lineKinds[i] === skipKind) continue;
    outLines.push(lines[i]);
    outKinds.push(diff.lineKinds[i]);
  }
  return { code: outLines.join('\n'), lineKinds: outKinds };
};

/**
 * 按行对比两段源码，生成 unified diff（current + baseline 删除行）
 * @description 走标准 LCS 动态规划（demo 通常 < 150 行，O(m·n) 完全够用）。回溯阶段：a/b 同行 → context；a 独占 → removed（取自 baseline）；b 独占 → added（取自 current）。a/b 都耗尽前的串尾处理保持顺序稳定
 */
export const computeUnifiedDiff = (baseline: string, current: string): UnifiedDiff => {
  const a = baseline.split('\n');
  const b = current.split('\n');
  const m = a.length;
  const n = b.length;

  const lcs: Array<Array<number>> = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      outLines.push(b[j]);
      outKinds.push('context');
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      outLines.push(a[i]);
      outKinds.push('removed');
      i++;
    } else {
      outLines.push(b[j]);
      outKinds.push('added');
      j++;
    }
  }
  while (i < m) {
    outLines.push(a[i]);
    outKinds.push('removed');
    i++;
  }
  while (j < n) {
    outLines.push(b[j]);
    outKinds.push('added');
    j++;
  }

  return { code: outLines.join('\n'), lineKinds: outKinds };
};
