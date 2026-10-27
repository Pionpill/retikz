import type { IRFont, IRLine, IRMathSegment, IRTextSegment, IRSegmentedLine } from '../../schemas';

type WithResolvedFill<T> = T extends unknown ? Omit<T, 'fill'> & { fill?: string } : never;

/** 已将数值颜色转换为字符串的文字片段 */
export type ResolvedTextSegment = WithResolvedFill<IRTextSegment>;

/** 已将数值颜色转换为字符串的公式片段 */
export type ResolvedMathSegment = WithResolvedFill<IRMathSegment>;

/** 已解析颜色、尚待解析字体的文字或公式片段 */
export type ResolvedInlineSourceSegment = ResolvedTextSegment | ResolvedMathSegment;

/** 已解析行级与片段颜色的混排行 */
export type ResolvedSegmentedLine = Omit<IRSegmentedLine, 'segments' | 'fill'> &
  Readonly<{
    /** 已解析行级颜色 */
    fill?: string;
    /** 保留作者顺序的文本与行内内容片段 */
    segments: Array<ResolvedInlineSourceSegment>;
  }>;

/** 已解析颜色的单行文本输入 */
export type ResolvedTextLine =
  | string
  | (Omit<Extract<IRLine, { text: string }>, 'fill'> & {
      /** 当前文本行已解析的填充颜色 */
      fill?: string;
    })
  | ResolvedSegmentedLine;

/** 已解析颜色的单行或多行标签文本 */
export type ResolvedLabelTextBlock = string | Array<ResolvedTextLine>;

/** 字号解析所需的根字号与继承字号 */
export type FontSizeResolveContext = Readonly<{
  /** 字号预设与 rem 使用的基准字号 */
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
  /** 字号预设与 rem 使用的基准字号 */
  rootFontSize: number;
  /** 缺省字段的继承字体 */
  inheritedFont: CanonicalFont;
}>;

/** 已完成字体继承并换算字号的文字片段 */
export type CanonicalTextSegment = Omit<ResolvedTextSegment, 'font'> &
  Readonly<{
    /** 当前文本片段完成继承与默认值补全的字体 */
    font: CanonicalFont;
  }>;

/** 已完成字号解析的文字或公式片段 */
export type CanonicalInlineSegment =
  | CanonicalTextSegment
  | (Omit<ResolvedMathSegment, 'fontSize'> & { /** 有效数学字号 */ fontSize: number });

/** 进入字体解析前的文字或公式片段 */
export type SourceInlineSegment = ResolvedInlineSourceSegment;

/** 字符串拆分后的文字与公式片段 */
export type ParsedInlineSegments = Readonly<{
  /** 按原文顺序排列的片段 */
  segments: Array<SourceInlineSegment>;
  /** 是否包含公式片段 */
  hasMath: boolean;
  /** 是否遇到未闭合公式分隔符 */
  warn: boolean;
}>;

/** 纯文本布局所需的显式行样式 */
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

/** 单行内容、字体与样式的解析结果 */
export type TextLineResolution = Readonly<{
  /** 已继承行级外观并确定字体的片段 */
  segments: Array<CanonicalInlineSegment>;
  /** 按顺序拼接文字片段的内容，不含公式 */
  plainText: string;
  /** 是否包含公式片段 */
  hasMath: boolean;
  /** 是否按片段布局；含公式或显式使用 segments 时为 true */
  mixed: boolean;
  /** 仅包含作者显式写出的行级样式 */
  style?: ResolvedTextLineStyle;
}>;

/** 文本行解析所需的字体与诊断配置 */
export type TextLineResolveContext = FontResolveContext &
  Readonly<{
    /** 是否识别字符串中的 $...$ 和 $$...$$ 公式简写 */
    gatingOn: boolean;
    /** 接收未闭合公式分隔符的警告 */
    warn?: (code: string, message: string) => void;
    /** 未闭合公式分隔符的自定义警告文案 */
    warningMessage?: string;
  }>;

/** 文本解析器接受的已解析颜色的单行输入 */
export type TextLineSource = ResolvedTextLine;
