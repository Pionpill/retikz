/** ascent 近似占 fontSize 比例（基线之上） */
export const ASCENT_FACTOR = 0.8;

/** descent 近似占 fontSize 比例（基线之下） */
export const DESCENT_FACTOR = 0.2;

/**
 * 把按 `baseline` 解释的垂直锚点 `y` 折算成首行 alphabetic 基线 y
 * @description 多行文本首行基线在上、后续行按 lineHeight 向下堆叠；折算保持「关键字所指的块边界
 *   （top=块顶 ascent 线 / bottom=块底 descent 线 / middle=视觉中心 / alphabetic=首行基线）落在 y」。
 * @param y - 原垂直锚点（含义由 baseline 决定）
 * @param baseline - 锚点语义
 * @param lineCount - 文本行数（≥1）
 * @param lineHeight - 行高（相邻行基线间距）
 * @param fontSize - 字号（算 ascent/descent 用）
 * @returns 首行 alphabetic 基线 y
 */
export const toAlphabeticBaselineY = (
  y: number,
  baseline: 'top' | 'middle' | 'bottom' | 'alphabetic',
  lineCount: number,
  lineHeight: number,
  fontSize: number,
): number => {
  const asc = fontSize * ASCENT_FACTOR;
  const desc = fontSize * DESCENT_FACTOR;
  const span = (lineCount - 1) * lineHeight;
  switch (baseline) {
    case 'top':
      return y + asc;
    case 'bottom':
      return y - span - desc;
    case 'middle':
      return y - span / 2 + (asc - desc) / 2;
    case 'alphabetic':
      return y;
  }
};
