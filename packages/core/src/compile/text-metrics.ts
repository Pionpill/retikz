/** 字体规格：传给 TextMeasurer 的最小信息 */
export type FontSpec = {
  /** 字体族；不填走 fallback "sans-serif" */
  family?: string;
  /** 字号（user units） */
  size: number;
  /** 字重；可以是 'normal' / 'bold' / 100~900 数字等 */
  weight?: string | number;
  /** 字形：normal 或 italic */
  style?: 'normal' | 'italic';
};

/** 文字度量结果：宽高 + 可选的基线 ascent/descent */
export type TextMetrics = {
  /** 文本宽度（user units） */
  width: number;
  /** 文本高度（user units），通常 ≈ ascent + descent */
  height: number;
  /** 基线以上的高度；不一定所有 measurer 都返回 */
  ascent?: number;
  /** 基线以下的深度；不一定所有 measurer 都返回 */
  descent?: number;
};

/**
 * 文字度量函数接口（编译期由 adapter 注入）。
 * - @retikz/react：用 canvas measureText
 * - @retikz/ssr：用 opentype.js / fontkit
 * - @retikz/canvas：用 ctx.measureText
 */
export type TextMeasurer = (text: string, font: FontSpec) => TextMetrics;

/** 默认 fallback 度量：基于平均字宽估算，不准但保证可运行 */
export const fallbackMeasurer: TextMeasurer = (text, font) => ({
  width: text.length * font.size * 0.55,
  height: font.size * 1.2,
});
