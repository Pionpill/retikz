import type { TextBlockContent, TextContentLine, TextFont } from '../../contract';
import type { IRFont, IRLine, IRMathSegment, IRTextSegment, IRSegmentedLine } from '../../schemas';

/** 文本解析结果，补充供节点编译选择输出形式的作者行信息 */
export type CanonicalTextBlock = Omit<TextBlockContent, 'lines'> &
  Readonly<{
    /** 已解析并保留内部分类信息的作者行 */
    lines: Array<CanonicalTextLine>;
  }>;

/** 公共行内容与解析阶段确定的内部分类信息 */
export type CanonicalTextLine = TextContentLine &
  Readonly<{
    /** 拼接后的纯文本，不含公式 */
    plainText: string;
    /** 是否包含公式 */
    hasMath: boolean;
    /** 是否需要按片段输出 */
    mixed: boolean;
  }>;

type WithStringFill<T> = T extends unknown ? Omit<T, 'fill'> & { fill?: string } : never;

/** 已将数值颜色转换为字符串的文字片段 */
export type TextSegmentColorSource = WithStringFill<IRTextSegment>;

/** 已将数值颜色转换为字符串的公式片段 */
export type MathSegmentColorSource = WithStringFill<IRMathSegment>;

/** 已解析颜色、尚待解析字体的文字或公式片段 */
export type InlineSegmentColorSource = TextSegmentColorSource | MathSegmentColorSource;

/** 已解析行级与片段颜色的混排行 */
type SegmentedLineColorSource = Omit<IRSegmentedLine, 'segments' | 'fill'> &
  Readonly<{
    /** 已解析行级颜色 */
    fill?: string;
    /** 保留作者顺序的文本与行内内容片段 */
    segments: Array<InlineSegmentColorSource>;
  }>;

/** 已解析颜色的单行文本输入 */
export type ColorResolvedTextLine =
  | string
  | (Omit<Extract<IRLine, { text: string }>, 'fill'> & {
      /** 当前文本行已解析的填充颜色 */
      fill?: string;
    })
  | SegmentedLineColorSource;

/** 已解析颜色的单行或多行标签文本 */
export type LabelTextColorSource = string | Array<ColorResolvedTextLine>;

/** 共享文本块解析输入，颜色已由宿主确定 */
export type InputTextBlockResolution = {
  /** 作者文本内容 */
  text: LabelTextColorSource;
  /** 块字体覆盖 */
  font?: IRFont;
  /** 块文字主色 */
  textColor?: string;
  /** 块内行对齐 */
  textAlign?: CanonicalTextBlock['textAlign'];
  /** 作者行高 */
  lineHeight?: number;
  /** 作者宽度限制 */
  maxTextWidth?: number;
};

/** 字体继承与宿主提供的文本缩放 */
export type TextBlockResolveContext = TextLineResolveContext & {
  /** 本阶段需要应用的轴向缩放，省略表示宿主在外层执行变换 */
  scale?: { x: number; y: number };
};

/** 字号解析所需的根字号与继承字号 */
export type FontSizeResolveContext = Readonly<{
  /** 字号预设与 rem 使用的基准字号 */
  rootFontSize: number;
  /** em 与缺省值继承的当前字号 */
  inheritedFontSize: number;
}>;

/** 字体继承解析上下文 */
export type FontResolveContext = Readonly<{
  /** 字号预设与 rem 使用的基准字号 */
  rootFontSize: number;
  /** 缺省字段的继承字体 */
  inheritedFont: TextFont;
}>;

/** 字符串拆分后的文字与公式片段 */
export type ParsedInlineSegments = Readonly<{
  /** 按原文顺序排列的片段 */
  segments: Array<InlineSegmentColorSource>;
  /** 是否包含公式片段 */
  hasMath: boolean;
  /** 是否遇到未闭合公式分隔符 */
  warn: boolean;
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

/** 已规范化的文字度量结果 */
export type CanonicalTextMetrics = {
  /** 文本宽度 */
  width: number;
  /** 文本视觉盒高度 */
  height: number;
  /** 规范化后的基线上伸 */
  ascent: number;
  /** 规范化后的基线下伸 */
  descent: number;
};
