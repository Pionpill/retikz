import type { IRFont, IRLine, IRMathRun, IRTextRun } from '../../schemas';

/** 字号解析所需的根字号与继承字号 */
export type FontSizeResolveContext = Readonly<{
  /** preset 与 rem 的根字号 */
  rootFontSize: number;
  /** em 与缺省值继承的当前字号 */
  inheritedFontSize: number;
}>;

/** 已确定为数值字号的字体 */
export type CanonicalFont = Readonly<{
  /** 数值字号 */
  size: number;
  /** 字体族 */
  family?: IRFont['family'];
  /** 字重 */
  weight?: IRFont['weight'];
  /** 字形 */
  style?: IRFont['style'];
}>;

/** 字体继承解析上下文 */
export type FontResolveContext = Readonly<{
  /** preset 与 rem 的根字号 */
  rootFontSize: number;
  /** 缺省字段的继承字体 */
  inheritedFont: CanonicalFont;
}>;

/** 已解析字体的文本 run */
export type CanonicalTextRun = Omit<IRTextRun, 'font'> & Readonly<{ font: CanonicalFont }>;

/** 已确定的行内文字或公式 run */
export type CanonicalInlineRun = CanonicalTextRun | IRMathRun;

/** Source IR 行内文字或公式 run */
export type SourceInlineRun = IRTextRun | IRMathRun;

/** 行内 shorthand 解析结果 */
export type ParsedInlineRuns = Readonly<{
  /** Source IR run 序列 */
  runs: Array<SourceInlineRun>;
  /** 是否包含公式 run */
  hasMath: boolean;
  /** 是否遇到未闭合公式分隔符 */
  warn: boolean;
}>;

/** 纯文本快路径需要保留的显式行样式 */
export type ResolvedTextLineStyle = Readonly<{
  /** 显式行填充色 */
  fill?: string;
  /** 显式行不透明度 */
  opacity?: number;
  /** 已确定的显式行字号 */
  fontSize?: number;
  /** 显式行字体族 */
  fontFamily?: IRFont['family'];
  /** 显式行字重 */
  fontWeight?: IRFont['weight'];
  /** 显式行字形 */
  fontStyle?: IRFont['style'];
}>;

/** 单行 Source IR 的确定化结果 */
export type TextLineResolution = Readonly<{
  /** 已确定字体和行样式的 run */
  runs: Array<CanonicalInlineRun>;
  /** 去除公式 run 后的纯文本内容 */
  plainText: string;
  /** 是否包含公式 run */
  hasMath: boolean;
  /** 是否需要逐 run 混排 */
  mixed: boolean;
  /** 仅包含作者显式写出的行级样式 */
  style?: ResolvedTextLineStyle;
}>;

/** 文本行确定化上下文 */
export type TextLineResolveContext = FontResolveContext &
  Readonly<{
    /** 是否启用 `$...$` 公式 shorthand */
    gatingOn: boolean;
    /** warning 分发函数 */
    warn?: (code: string, message: string) => void;
    /** 未闭合公式 shorthand 的宿主诊断文案 */
    warningMessage?: string;
  }>;

/** 可由文本 resolver 消费的单行 Source IR */
export type TextLineSource = IRLine;
