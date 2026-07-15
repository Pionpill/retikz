/** ascent 近似占 fontSize 比例（基线之上） */
export const ASCENT_FACTOR = 0.8;

/** descent 近似占 fontSize 比例（基线之下） */
export const DESCENT_FACTOR = 0.2;

/** 文本基线换算输入 */
export type AlphabeticBaselineInput = {
  /** 文本锚点 y */
  y: number;
  /** 原始垂直锚点 */
  baseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
  /** 行数 */
  lineCount: number;
  /** 行高 */
  lineHeight: number;
  /** 字号 */
  fontSize: number;
};

/** 把文本块垂直锚点折算成首行 alphabetic 基线 y */
export const toAlphabeticBaselineY = (input: AlphabeticBaselineInput): number => {
  const { y, baseline, lineCount, lineHeight, fontSize } = input;
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
