import type { IRFont, IRLine, IRMathSegment, IRTextSegment, IRSegmentedLine } from '../../schemas';

type WithResolvedFill<T> = T extends unknown ? Omit<T, 'fill'> & { fill?: string } : never;

/** 已把派生颜色确定为字符串的文字 segment */
export type ResolvedTextSegment = WithResolvedFill<IRTextSegment>;

/** 已把派生颜色确定为字符串的公式 segment */
export type ResolvedMathSegment = WithResolvedFill<IRMathSegment>;

/** 已把派生颜色确定为字符串的行内 Source segment */
export type ResolvedInlineSourceSegment = ResolvedTextSegment | ResolvedMathSegment;

/** 已把 segment 派生颜色确定为字符串的混排行 */
export type ResolvedSegmentedLine = Omit<IRSegmentedLine, 'segments' | 'fill'> &
  Readonly<{
    /** 已解析行级颜色 */
    fill?: string;
    /** 保留作者顺序的文本与行内内容片段 */
    segments: Array<ResolvedInlineSourceSegment>;
  }>;

/** 已把派生颜色确定为字符串的单行 Source */
export type ResolvedTextLine =
  | string
  | (Omit<Extract<IRLine, { text: string }>, 'fill'> & {
      /** 当前文本行已解析的填充颜色 */
      fill?: string;
    })
  | ResolvedSegmentedLine;

/** 已把派生颜色确定为字符串的 label 单行内容 */
export type ResolvedLabelTextContent = string | ResolvedSegmentedLine;

/** 已把派生颜色确定为字符串的路径标签文本块 */
export type ResolvedLabelTextBlock = ResolvedTextLine | Array<ResolvedTextLine>;

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

/** 已解析字体的文本 segment */
export type CanonicalTextSegment = Omit<ResolvedTextSegment, 'font'> &
  Readonly<{
    /** 当前文本片段完成继承与默认值补全的字体 */
    font: CanonicalFont;
  }>;

/** 已确定的行内文字或公式 segment */
export type CanonicalInlineSegment =
  | CanonicalTextSegment
  | (Omit<ResolvedMathSegment, 'fontSize'> & { /** 有效数学字号 */ fontSize: number });

/** Source IR 行内文字或公式 segment */
export type SourceInlineSegment = ResolvedInlineSourceSegment;

/** 行内 shorthand 解析结果 */
export type ParsedInlineSegments = Readonly<{
  /** Source IR segment 序列 */
  segments: Array<SourceInlineSegment>;
  /** 是否包含公式 segment */
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
  /** 已确定字体和行样式的 segment */
  segments: Array<CanonicalInlineSegment>;
  /** 去除公式 segment 后的纯文本内容 */
  plainText: string;
  /** 是否包含公式 segment */
  hasMath: boolean;
  /** 是否需要逐 segment 混排 */
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
export type TextLineSource = ResolvedTextLine;
