import type { Position } from '@retikz/math';
import { DEG_TO_RAD, RAD_TO_DEG, normalizeDegrees } from '@retikz/math';

import type { TextMeasurer } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRBoundaryLabel } from '../../schemas';

/** 默认字号，同时作为 preset 与 rem 的解析根字号 */
export const DEFAULT_FONT_SIZE = 16;

/** ascent 近似占 fontSize 比例（基线之上） */
export const ASCENT_FACTOR = 0.8;

/** descent 近似占 fontSize 比例（基线之下） */
export const DESCENT_FACTOR = 0.2;

/** 文本基线换算输入 */
type InputAlphabeticBaseline = {
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
export const calculateAlphabeticBaselineY = (input: InputAlphabeticBaseline): number => {
  const { y, baseline, lineCount, lineHeight, fontSize } = input;
  const ascent = fontSize * ASCENT_FACTOR;
  const descent = fontSize * DESCENT_FACTOR;
  const span = (lineCount - 1) * lineHeight;

  switch (baseline) {
    case 'top':
      return y + ascent;
    case 'bottom':
      return y - span - descent;
    case 'middle':
      return y - span / 2 + (ascent - descent) / 2;
    case 'alphabetic':
      return y;
  }
};

/**
 * 兜底文字度量
 * @description 基于平均字宽估算；非法字号会 throw
 */
export const fallbackMeasurer: TextMeasurer = (text, font) => {
  if (!Number.isFinite(font.size) || font.size < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `fallbackMeasurer: invalid font.size '${font.size}'; must be a non-negative finite number`,
    );
  }

  return {
    width: text.length * font.size * 0.55,
    height: font.size * 1.2,
  };
};

/** 根据外向轴解析文字旋转，保持 Node 既有翻转语义 */
export const calculateLabelRotation = (
  rotate: IRBoundaryLabel['rotate'],
  keepUpright: boolean | undefined,
  outward: Position,
): number => {
  if (rotate === undefined || rotate === 'none') return 0;

  let degrees =
    typeof rotate === 'number'
      ? rotate
      : Math.atan2(outward[1], outward[0]) * RAD_TO_DEG + (rotate === 'tangent' ? 90 : 0);
  const normalized = normalizeDegrees(degrees);
  if (keepUpright && normalized > 90 && normalized < 270) degrees += 180;

  return degrees;
};

/** 旋转文字布局框沿单位向量的半投影长度 */
export const calculateLabelProjectedHalfExtent = (
  vector: Position,
  width: number,
  height: number,
  degrees: number,
): number => {
  const angle = degrees * DEG_TO_RAD;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return (
    (Math.abs(vector[0] * cos + vector[1] * sin) * width) / 2 +
    (Math.abs(-vector[0] * sin + vector[1] * cos) * height) / 2
  );
};

/** 按既有折行规则把文本拆成可断单元与规范化空格 */
export const tokenizeText = (text: string): Array<string> => {
  /** CJK / 全角字符范围：无需空白分隔，折行时可按单字符切分 */
  const isCjk = (character: string): boolean => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      (codePoint >= 0x3000 && codePoint <= 0x303f) ||
      (codePoint >= 0x3040 && codePoint <= 0x30ff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xff00 && codePoint <= 0xffef)
    );
  };

  const units: Array<string> = [];

  for (const segment of text.split(/(\s+)/)) {
    if (segment === '') continue;
    if (/^\s+$/.test(segment)) {
      units.push(' ');
      continue;
    }

    let run = '';

    for (const character of segment) {
      if (isCjk(character)) {
        if (run) {
          units.push(run);
          run = '';
        }

        units.push(character);
      } else {
        run += character;
      }
    }

    if (run) units.push(run);
  }

  return units;
};
