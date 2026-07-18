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
