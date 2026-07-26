/** 字体规格：传给 TextMeasurer 的最小信息 */
export type FontSpec = {
  /**
   * 字体族
   * @default 'sans-serif'
   */
  family?: string;
  /** 字号（user units） */
  size: number;
  /**
   * 字重
   * @default 'normal'
   */
  weight?: string | number;
  /**
   * 字形：normal / italic / oblique
   * @default 'normal'
   */
  style?: 'normal' | 'italic' | 'oblique';
};

/** 文字度量结果：宽高 + 可选的基线 ascent/descent */
export type TextMetrics = {
  /** 文本宽度（user units） */
  width: number;
  /** 文本高度（user units） */
  height: number;
  /**
   * 基线以上的高度
   * @default 由调用方按字体估算
   */
  ascent?: number;
  /**
   * 基线以下的深度
   * @default 由调用方按字体估算
   */
  descent?: number;
};

/** 已规范化的文字度量结果 */
export type NormalizedTextMetrics = {
  /** 文本宽度 */
  width: number;
  /** 文本视觉盒高度 */
  height: number;
  /** 规范化后的基线上伸 */
  ascent: number;
  /** 规范化后的基线下伸 */
  descent: number;
};

/** 校验并规范化单次文字度量结果 */
export const normalizeTextMetrics = (metrics: TextMetrics): NormalizedTextMetrics => {
  const assertMetric = (name: keyof TextMetrics, value: number): void => {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`normalizeTextMetrics: invalid ${name} '${value}'; must be a non-negative finite number`);
    }
  };

  assertMetric('width', metrics.width);
  assertMetric('height', metrics.height);
  if (metrics.ascent !== undefined) assertMetric('ascent', metrics.ascent);
  if (metrics.descent !== undefined) assertMetric('descent', metrics.descent);

  let ascent: number;
  let descent: number;
  if (metrics.ascent !== undefined && metrics.descent !== undefined) {
    const measuredVerticalSpan = metrics.ascent + metrics.descent;
    if (!Number.isFinite(measuredVerticalSpan)) {
      throw new Error(
        `normalizeTextMetrics: invalid ascent/descent sum '${measuredVerticalSpan}'; must be a non-negative finite number`,
      );
    }
    const visualHeight = Math.max(metrics.height, measuredVerticalSpan);
    const leadingHalf = (visualHeight - measuredVerticalSpan) / 2;
    ascent = metrics.ascent + leadingHalf;
    descent = metrics.descent + leadingHalf;
  } else if (metrics.ascent !== undefined) {
    const visualHeight = Math.max(metrics.height, metrics.ascent);
    ascent = metrics.ascent;
    descent = visualHeight - metrics.ascent;
  } else if (metrics.descent !== undefined) {
    const visualHeight = Math.max(metrics.height, metrics.descent);
    ascent = visualHeight - metrics.descent;
    descent = metrics.descent;
  } else {
    ascent = metrics.height / 2;
    descent = metrics.height / 2;
  }

  return {
    width: metrics.width,
    height: ascent + descent,
    ascent,
    descent,
  };
};

/** 文字度量函数接口 */
export type TextMeasurer = (text: string, font: FontSpec) => TextMetrics;

/**
 * 兜底文字度量
 * @description 基于平均字宽估算；非法字号会 throw
 */
export const fallbackMeasurer: TextMeasurer = (text, font) => {
  if (!Number.isFinite(font.size) || font.size < 0) {
    throw new Error(`fallbackMeasurer: invalid font.size '${font.size}'; must be a non-negative finite number`);
  }
  return {
    width: text.length * font.size * 0.55,
    height: font.size * 1.2,
  };
};
