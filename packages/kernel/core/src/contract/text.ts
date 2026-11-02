/** 字体规格：传给 TextMeasurer 的最小信息 */
export type TextFont = {
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
   * 基线以上的高度；省略时由 resolveTextMetrics 根据总高度与 descent 补齐，两者均省略时各取总高度的一半
   * @default resolveTextMetrics
   */
  ascent?: number;
  /**
   * 基线以下的深度；省略时由 resolveTextMetrics 根据总高度与 ascent 补齐，两者均省略时各取总高度的一半
   * @default resolveTextMetrics
   */
  descent?: number;
};

/** 文字度量函数接口 */
export type TextMeasurer = (text: string, font: TextFont) => TextMetrics;
