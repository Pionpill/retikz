import type { JsonObject, PropertyPath } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox, Position } from '@retikz/math';

import type {
  TextFont,
  LayoutAxisProposal,
  Transform,
  TextLine,
  TextMeasurer,
  LayoutAlignmentGuide,
} from '../../contract';
import type { CanonicalNode } from '../../resolve';
import type { IRAnimationTrack, CanonicalDropShadow } from '../../schemas';
import type { BoundaryState } from '../boundary';
import type { PositionTargetEvaluateContext } from '../reference';
import type { RegisterPaint } from '../resource';
import type { CompiledDrawing } from '../scene';
import type { ComposedScopeTransform, CompileWarningCode } from '../shared';
import type { CompiledTextBlockLayout, CompiledTextLineLayout, TexLowerer } from '../text';
import type { NodeContentLayout } from './content';

/** 节点最终位置、视觉尺寸和连接边界 */
export type CompiledNodeGeometry = {
  /** 节点视觉外框及旋转 */
  rect: CenteredBox;
  /** 连接边界的最终外扩距离 */
  margin: BoundsInsets;
};

/** 节点实际占位与正文内容盒，不重复存放视觉 rect */
export type CompiledNodeMetrics = {
  /** 正文内容盒中心 */
  contentCenter: Position;
  /** 正文实际占用尺寸 */
  contentSize: { width: number; height: number };
  /** 可供父布局读取的对齐线 */
  alignmentGuides?: Array<LayoutAlignmentGuide>;
};

/** 节点最终输出身份与来源元数据 */
export type CompiledNodeMetadata = {
  /** 节点输出标识 */
  id?: string;
  /** 节点来源元数据 */
  meta?: JsonObject;
};

/** 节点的最终形状外观 */
export type CompiledNodeStyle = {
  /** 与形状图元结构逐项对应的外观 */
  shape: CompiledDrawing['style'];
  /** 已确定的阴影，省略表示无阴影 */
  shadow?: CanonicalDropShadow;
};

/** 附属标签最终排版和绘制内容，不持有布局意图 */
export type CompiledNodeLabel = CompiledDrawing & {
  /** 标签最终尺寸与相对定位 */
  layout: Omit<NodeLabelLayout, 'lineLayout'>;
};

/** 节点正文最终外观，物理行通过索引读取，不持有作者正文或解析产物 */
export type CompiledNodeTextStyle = {
  /** 正文主色 */
  color?: string;
  /** 正文整体透明度 */
  opacity?: number;
  /** 对应作者行与片段的最终外观 */
  lines: Array<{
    /** 行级外观 */
    style?: Pick<TextLine, 'fill' | 'opacity'>;
    /** 片段级外观 */
    segments: Array<Pick<TextLine, 'fill' | 'opacity'>>;
  }>;
};

/** 最终正文排版与外观；绘制只需此结果及节点内容盒 */
export type CompiledNodeText = {
  /** 文字和公式的实际测量、折行及片段位置 */
  layout: CompiledNodeTextLayout;
  /** 与排版分离的最终外观 */
  style: CompiledNodeTextStyle;
};

/** 节点最终产物，保留后续几何查询必需的能力绑定 */
export type CompiledNode = {
  /** 视觉形状查询使用的定义与参数 */
  shape: CanonicalNode['shape'];
  /** 默认连接面查询使用的定义与参数 */
  boundary: CanonicalNode['boundary'];
  /** 视觉几何 */
  geometry: CompiledNodeGeometry;
  /** 与外观分离的最终形状图元结构 */
  structure: { shape: CompiledDrawing['structure'] };
  /** 布局占用与对齐信息 */
  layout: CompiledNodeMetrics;
  /** 最终输出身份与来源元数据 */
  metadata: CompiledNodeMetadata;
  /** 最终形状外观 */
  style: CompiledNodeStyle;
  /** 正文排版与样式，省略表示无正文 */
  text?: CompiledNodeText;
  /** 附属标签最终结果 */
  labels: Array<CompiledNodeLabel>;
  /** 已确定的动画轨道 */
  animations: Array<IRAnimationTrack>;
};

/** 节点正文与附属 label 共享的文本布局上下文 */
export type NodeTextLayoutContext = {
  /** 待布局节点 */
  canon: CanonicalNode;
  /** 文本度量函数 */
  measureText: TextMeasurer;
  /** TeX 降级上下文 */
  tex?: TexLoweringContext;
};

/** 公式渲染上下文 */
export type TexLoweringContext = {
  /** 将公式源码转换为可参与文本布局的结果；未提供时由公式布局分支处理缺失能力 */
  lowerTex?: TexLowerer;
  /** 分发公式降级或布局过程中产生的编译诊断 */
  warn: (code: CompileWarningCode, message: string) => void;
};

/** 物理行排版与其作者行的对应关系 */
export type CompiledNodeTextLineLayout = Omit<TextLine, 'fill' | 'opacity'> & {
  /** 该物理行的实际度量高度 */
  measuredHeight: number;
  /** 折行前的作者行索引，供绘制阶段读取当前外观 */
  sourceLineIndex: number;
};

/** 节点测量和定位产生的几何结果 */
export type NodeLayoutGeometry = {
  /** 视觉外框，rotate 使用弧度 */
  rect: CenteredBox;
  /** 缩放后的外边距 */
  margin: BoundsInsets;
  /** 正文内容中心 */
  contentCenter: Position;
  /** 正文内容尺寸，合成布局也可保留无文本的内容盒 */
  contentSize: { width: number; height: number };
};

/** 节点正文排版结果 */
export type CompiledNodeTextLayout = {
  /** 实际用于测量和输出的字体 */
  font: TextFont;
  /** 正文对齐方式 */
  align: 'start' | 'middle' | 'end';
  /** 实际行高 */
  lineHeight: number;
  /** 物理行相对内容顶部的基线偏移 */
  baselineOffsets?: Array<number>;
} & (
  | { kind: 'plain'; lines: Array<CompiledNodeTextLineLayout> }
  | {
      kind: 'inline';
      lines: Array<{ lineLayout: CompiledTextLineLayout; baselineOffset: number; sourceLineIndex: number }>;
    }
);

/** 节点测量、定位和标签排版结果及后续查询必需的绑定 */
export type CompiledNodeLayout = {
  /** 当前形状定义和参数 */
  shape: CanonicalNode['shape'];
  /** 当前连接面定义和参数 */
  boundary: CanonicalNode['boundary'];
  /** 测量和定位结果 */
  geometry: NodeLayoutGeometry;
  /** 正文排版结果 */
  text?: CompiledNodeTextLayout;
  /** 已定位的附属标签 */
  labels?: Array<NodeLabelLayout>;
};

/** 正文与形状联合求解后的主体测量，不包含节点位置 */
export type MeasuredNodeBody = {
  /** 最终宽度预算对应的正文排版 */
  contentLayout: NodeContentLayout;
  /** 应用最小尺寸与固定宽度后的视觉尺寸 */
  size: { width: number; height: number };
  /** 形状外接中心相对包含 padding 的内容盒中心的偏移 */
  offset?: Position;
};

/** 节点放置后的视觉矩形和正文中心 */
export type NodePlacement = Pick<NodeLayoutGeometry, 'rect' | 'contentCenter'>;

/** 标签相对节点的放置，不包含文本测量 */
export type CompiledNodeLabelPlacement = Pick<NodeLabelLayout, 'rotateDeg' | 'centerOffset'>;

/** 调用方已确认有效的单标签布局阶段产物 */
export type PreparedNodeLabelLayout = {
  /** 标签自身的文本测量 */
  measurement?: MeasuredNodeLabel;
  /** 标签相对主体的放置 */
  placement?: CompiledNodeLabelPlacement;
};

/** 调用方保证适用于当前输入与上下文的节点布局产物 */
export type PreparedNodeLayout = {
  /** 完整布局；提供时跳过所有布局计算 */
  overall?: CompiledNodeLayout;
  /** 主体测量；缺省时求解正文与形状尺寸 */
  body?: MeasuredNodeBody;
  /** 最终节点位置；缺省时读取当前定位依赖 */
  placement?: NodePlacement;
  /** 与当前 Canonical 标签顺序对应的阶段产物；缺项按需计算 */
  labels?: Array<PreparedNodeLabelLayout>;
};

/** 调用方保证适用于当前输入与上下文的节点阶段产物 */
export type PreparedNodeCompilation = {
  /** 完整或部分布局产物，缺失阶段由 Core 执行 */
  layout?: PreparedNodeLayout;
};

/** 已完成内容与视觉盒测量、尚未绑定 Node rect 的附属标签 */
export type MeasuredNodeLabel = {
  /** 混排计算结果 */
  lineLayout: CompiledTextBlockLayout;
  /** 测量宽度 */
  measuredWidth: number;
  /** 测量高度 */
  measuredHeight: number;
  /** 基线上伸 */
  ascent: number;
  /** 基线下伸 */
  descent: number;
};

/** 节点附属标签的最终局部布局 */
export type NodeLabelLayout = MeasuredNodeLabel & {
  /** 最终 label 自旋角 */
  rotateDeg: number;
  /** 相对最终 Node rect 几何中心的局部偏移 */
  centerOffset: [number, number];
};

/** 节点编译使用的测量、定位、资源与诊断能力 */
export type NodeCompileContext = {
  /** 当前节点的来源路径 */
  irPath?: PropertyPath;
  /** 文本测量函数 */
  measureText: TextMeasurer;
  /** 调用方提供的当前节点连接面缓存与诊断状态；省略时只使用本次诊断信息 */
  boundaryState?: BoundaryState;
  /** 位置与目标的运行时求值能力 */
  positionContext: PositionTargetEvaluateContext;
  /** 当前 scope 累积 transform */
  scopeChain?: ReadonlyArray<Transform>;
  /** 当前 Scope 已合成的坐标消费态 */
  composedTransform?: ComposedScopeTransform;
  /** TeX 降级上下文 */
  texLowering?: TexLoweringContext;
  /** 当前 node 的 compile warning 分发函数 */
  warn?: (code: CompileWarningCode, message: string) => void;
  /** 父级给 allocation box 的水平 proposal */
  allocationWidthProposal?: LayoutAxisProposal;
  /** 数值圆整 */
  round: (value: number) => number;
  /** 绘制资源登记 */
  registerPaint: RegisterPaint;
};
