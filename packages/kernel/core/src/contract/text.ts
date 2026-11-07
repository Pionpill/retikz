import type { IRTextSegment, IRMathSegment } from '../schemas';

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
   * @default 400
   */
  weight?: number;
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

/**
 * 文字度量函数接口
 * @param text 待测量文本
 * @param font 本次测量使用的字体
 * @param disableCache 是否绕过本次调用的缓存读取和写入，默认 false；无缓存的实现可忽略此参数
 */
export type TextMeasurer = (text: string, font: TextFont, disableCache?: boolean) => TextMetrics;

/** 已完成字体、排版配置与内容解析的共享文本块 */
export type TextBlockContent = Readonly<{
  /** 有效块字体 */
  font: TextFont;
  /** 块内行对齐 */
  textAlign: 'start' | 'middle' | 'end';
  /** 有效行槽高度 */
  lineHeight: number;
  /** 有效折行宽度，省略表示无作者限制 */
  maxTextWidth?: number;
  /** 有效文字主色 */
  color?: string;
  /** 已解析的作者行 */
  lines: Array<TextContentLine>;
}>;

/** 已完成字体继承并换算字号的文字片段 */
type TextContentSegment = Omit<IRTextSegment, 'font' | 'fill'> & { fill?: string } & Readonly<{
    /** 当前文本片段完成继承与默认值补全的字体 */
    font: TextFont;
  }>;

/** 已完成字号解析的文字或公式片段 */
export type TextInlineSegment =
  | TextContentSegment
  | (Omit<IRMathSegment, 'fontSize' | 'fill'> & { fill?: string } & { /** 有效数学字号 */ fontSize: number });

/** 纯文本布局所需的显式行样式 */
export type TextContentLineStyle = Readonly<{
  /** 显式行填充色 */
  fill?: string;
  /** 显式行不透明度 */
  opacity?: number;
  /** 仅保留显式声明的字体字段，字号已换算为数值，不补入继承值 */
  font?: Partial<TextFont>;
}>;

/** 单行内容、字体与样式的解析结果 */
export type TextContentLine = Readonly<{
  /** 已继承行级外观并确定字体的片段 */
  segments: Array<TextInlineSegment>;
  /** 仅包含作者显式写出的行级样式 */
  style?: TextContentLineStyle;
}>;
