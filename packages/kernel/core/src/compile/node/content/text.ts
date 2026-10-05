import type { TextFont, TextMeasurer } from '../../text';

/** 行高倍率 */
export const DEFAULT_LINE_HEIGHT_FACTOR = 1.2;

/** CJK / 全角字符范围：无需空白分隔，折行时可按单字符切分 */
const isCjk = (ch: string): boolean => {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x3000 && c <= 0x303f) ||
    (c >= 0x3040 && c <= 0x30ff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xff00 && c <= 0xffef)
  );
};

/**
 * 文本折行使用的字体、行宽上限与测量能力
 * @description 行宽与测量结果使用同一绘图单位；此对象只提供折行条件，不保存中间行内容
 */
export type WrapTextContext = {
  /** 文本字体 */
  font: TextFont;
  /** 最大行宽 */
  maxWidth: number;
  /** 文本测量函数 */
  measureText: TextMeasurer;
};

/** 按既有折行规则把文本拆成可断单元与规范化空格 */
const tokenizeText = (text: string): Array<string> => {
  const units: Array<string> = [];

  for (const seg of text.split(/(\s+)/)) {
    if (seg === '') continue;
    if (/^\s+$/.test(seg)) {
      units.push(' ');
      continue;
    }

    let run = '';

    for (const ch of seg) {
      if (isCjk(ch)) {
        if (run) {
          units.push(run);
          run = '';
        }

        units.push(ch);
      } else {
        run += ch;
      }
    }

    if (run) units.push(run);
  }

  return units;
};

/** 用既有 tokenization 与文本测量器返回最宽不可断单元 */
export const measureMinimumTextWidth = (
  text: string,
  context: Pick<WrapTextContext, 'font' | 'measureText'>,
): number => {
  const { font, measureText } = context;
  return tokenizeText(text).reduce(
    (width, unit) => (unit === ' ' ? width : Math.max(width, measureText(unit, font).width)),
    0,
  );
};

/**
 * 按测量宽度贪心折行，西文按词、CJK 按字寻找可断位置
 * @description 连续空白归一为单空格；单个不可断片段超宽时允许溢出，不强行截断
 * @param text 待折行文本
 * @param context 字体、最大行宽和使用同一坐标单位的文本测量器
 * @returns 按原文顺序排列的文本行；空白文本返回仅含空字符串的一行
 */
export const wrapText = (text: string, context: WrapTextContext): Array<string> => {
  const { font, maxWidth, measureText } = context;
  const units = tokenizeText(text);

  const lines: Array<string> = [];
  let cur = '';

  for (const u of units) {
    if (u === ' ') {
      if (cur !== '') cur += ' ';
      continue;
    }

    const candidate = cur === '' ? u : cur + u;

    // cur 为空时即使溢出也接受（单 token 宽于阈值 → 溢出不硬断）
    if (cur !== '' && measureText(candidate, font).width > maxWidth) {
      lines.push(cur.trimEnd());
      cur = u;
    } else {
      cur = candidate;
    }
  }

  if (cur.trimEnd() !== '') lines.push(cur.trimEnd());

  return lines.length > 0 ? lines : [''];
};
