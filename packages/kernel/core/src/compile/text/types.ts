import type { Position } from '@retikz/math';

import type { TextFont, TextInlineSegment, TextMeasurer } from '../../contract';
import type { IRBoundaryLabel } from '../../schemas';
import type { CompileWarningCode } from '../shared';
import type { LoweredTexPath, TexLowerer } from './tex';

/** 布局阶段消费的文字或公式输入，不含宿主外观 */
export type InputInlineSegmentLayout =
  | Omit<Extract<TextInlineSegment, { text: string }>, 'fill' | 'opacity'>
  | Omit<Extract<TextInlineSegment, { tex: string }>, 'fill' | 'opacity'>;

/** 绘制阶段只读的片段外观覆盖 */
export type InlineSegmentPaint = {
  /** 显式文字或公式宿主颜色 */
  readonly fill?: string;
  /** 与块透明度相乘的 segment 透明度 */
  readonly opacity?: number;
};

/** 混排行当前外观，独立于测量结果 */
export type TextLinePaint = {
  /** 块继承色 */
  readonly color?: string;
  /** 块透明度 */
  readonly opacity?: number;
  /** 原始 segment 顺序，包含未能降解的公式 */
  readonly segments: ReadonlyArray<InlineSegmentPaint>;
};

/** 混排行布局服务与块级字体，不接收宿主外观 */
export type TextLayoutContext = {
  /** 测量每个文本片段在指定字体下的尺寸 */
  measureText: TextMeasurer;
  /** TeX 降解能力 */
  lowerTex?: TexLowerer;
  /** 块级字体 */
  font: TextFont;
  /** 接收混排行布局与公式降解产生的诊断 */
  warn: (code: CompileWarningCode, message: string) => void;
};

/** 一行混排的布局结果 */
export type CompiledTextLineLayout = {
  /** 行宽 = Σ segment 宽 */
  width: number;
  /** 基线之上最大上伸（文字 ascent / 公式 height-depth） */
  ascent: number;
  /** 基线之下最大下伸（文字 descent / 公式 depth） */
  descent: number;
  /** 按原始 segment 索引定位外观的纯数据片段 */
  pieces: Array<InlinePiece>;
};

/** 已测量的普通文字片段 */
type InlineTextPiece = {
  /** 片段类别 */
  kind: 'text';
  /** 原始作者片段索引 */
  segmentIndex: number;
  /** 相对行起点的水平偏移 */
  x: number;
  /** 当前文字内容 */
  text: string;
  /** 文字字体 */
  font: TextFont;
  /** 片段测量宽度 */
  width: number;
  /** 片段测量高度 */
  measuredHeight: number;
};

/** 已降解的公式片段 */
type InlineTexPiece = {
  /** 片段类别 */
  kind: 'math';
  /** 原始作者片段索引 */
  segmentIndex: number;
  /** 相对行起点的水平偏移 */
  x: number;
  /** 已快照的字形路径 */
  paths: Array<LoweredTexPath>;
  /** 公式宽度 */
  width: number;
  /** 公式总高度 */
  height: number;
  /** 公式基线以下深度 */
  depth: number;
};

/** 混排行中的纯数据片段 */
type InlinePiece = InlineTextPiece | InlineTexPiece;

/** 文本块物理行及其作者来源 */
export type CompiledTextBlockLine = {
  /** 作者行索引，供绘制读取当前外观 */
  sourceLineIndex: number;
  /** 已测量的片段及其原始片段索引 */
  lineLayout: CompiledTextLineLayout;
  /** 相对块顶部的基线 */
  baselineOffset: number;
};

/** 与绘制外观分离的文本块布局结果 */
export type CompiledTextBlockLayout = {
  /** 最宽物理行的宽度 */
  width: number;
  /** 全部物理行的行槽总高度 */
  height: number;
  /** 按阅读顺序排列的物理行 */
  lines: Array<CompiledTextBlockLine>;
};

/** 文本块有效行高与宿主提供的宽度预算 */
export type TextBlockLayoutOptions = {
  /** 已确定并缩放的行高 */
  lineHeight: number;
  /** 自动折行预算，省略时只处理硬换行 */
  maxTextWidth?: number;
};

/** 共享边界标签布局输入，向量均为宿主局部单位轴 */
export type InputLabelBox = {
  /** 决定内外放置、对齐及旋转的边界标签配置 */
  label: Pick<IRBoundaryLabel, 'rotate' | 'keepUpright' | 'placement' | 'align'>;
  /** 宿主局部坐标中的边界采样点 */
  point: Position;
  /** 采样点处朝外的单位法向量 */
  outward: Position;
  /** 采样点处沿边界的单位切向量 */
  tangent: Position;
  /** 已测量的标签文字框宽度 */
  width: number;
  /** 已测量的标签文字框高度 */
  height: number;
  /** 标签文字框与宿主边界之间的净距离 */
  distance: number;
};
