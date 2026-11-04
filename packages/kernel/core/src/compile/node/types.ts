import type { JsonObject, PropertyPath } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox, Position } from '@retikz/math';

import type {
  BoundaryDefinition,
  ConnectionEnvelopeKind,
  TextLine,
  TextMeasurer,
  ShapeDefinition,
} from '../../contract';
import type { ScenePrimitiveBase, LayoutAlignmentGuide } from '../../contract';
import type { CanonicalFont, CanonicalNode } from '../../resolve';
import type { IRAnimationTrack, CanonicalDropShadow } from '../../schemas';
import type { CompiledDrawing } from '../scene';
import type { CompileWarningCode } from '../shared';
import type { InlineLineLayout, TexLowerer } from '../text';

/** 节点最终位置、视觉尺寸及自定义形状图元几何 */
export type CompiledNodeGeometry = {
  /** 节点视觉外框及旋转 */
  rect: CenteredBox;
  /** 形状最终图元几何 */
  shape: CompiledDrawing['geometry'];
};

/** 节点实际占位与正文内容盒，不重复存放视觉 rect */
export type CompiledNodeLayout = {
  /** 最终外边距 */
  margin: BoundsInsets;
  /** 正文内容盒中心 */
  contentCenter: Position;
  /** 正文实际占用尺寸 */
  contentSize: { width: number; height: number };
  /** 可供父布局读取的对齐线 */
  alignmentGuides?: Array<LayoutAlignmentGuide>;
};

/** 节点的最终形状外观与输出身份 */
export type CompiledNodeStyle = {
  /** 与形状几何逐项对应的外观 */
  shape: CompiledDrawing['style'];
  /** 最终输出身份及交互元数据 */
  metadata: Omit<ScenePrimitiveBase, 'animations'>;
  /** 已确定的阴影，省略表示无阴影 */
  shadow?: CanonicalDropShadow;
};

/** 附属标签最终排版和绘制内容，不持有布局意图 */
export type CompiledNodeLabel = CompiledDrawing & {
  /** 标签最终尺寸与相对定位 */
  layout: Omit<NodeLabelLayout, 'laid'>;
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

/** 节点最终产物；后续连接查询显式结合 canon 能力与此处几何 */
export type CompiledNode = {
  /** 视觉几何 */
  geometry: CompiledNodeGeometry;
  /** 布局占用与对齐信息 */
  layout: CompiledNodeLayout;
  /** 最终外观与输出身份 */
  style: CompiledNodeStyle;
  /** 正文排版与样式，省略表示无正文 */
  text?: CompiledNodeText;
  /** 附属标签最终结果 */
  labels: Array<CompiledNodeLabel>;
  /** 已确定的动画轨道 */
  animations: Array<IRAnimationTrack>;
};

/** 连接面消费过程中的缓存和诊断状态 */
export type NodeBoundaryState = {
  /** 按连接面缓存已计算的包络 */
  connectionEnvelopeCache?: Map<string, CenteredBox>;
  /** 已发布回退诊断的连接面种类 */
  connectionEnvelopeWarnings?: Set<ConnectionEnvelopeKind>;
  /** 当前节点的诊断出口 */
  warn?: (code: CompileWarningCode, message: string) => void;
  /** 当前节点的来源路径 */
  irPath?: PropertyPath;
};

/** 已按视觉 rect 解析出的连接面几何 */
export type NodeBoundaryResolution = {
  /** 连接面 definition */
  def: ShapeDefinition | BoundaryDefinition;
  /** provider 使用的连接面 rect */
  rect: CenteredBox;
  /** 已校验参数 */
  params: JsonObject;
};

/** 节点视觉形状及其布局几何 */
export type NodeVisualResolution = {
  /** 节点视觉 shape definition */
  def: ShapeDefinition;
  /** 节点视觉 shape rect */
  rect: CenteredBox;
  /** 节点视觉 shape 参数 */
  params: JsonObject;
};

/** 节点正文与附属 label 共享的文本布局上下文 */
export type NodeTextLayoutContext = {
  /** 待布局节点 */
  node: CanonicalNode;
  /** 文本度量函数 */
  measureText: TextMeasurer;
  /** TeX 降级上下文 */
  tex?: TexLoweringContext;
};

/** 分别持有有效属性与计算布局的节点编译状态 */
export type NodeLayoutResult = {
  /** 当前有效语义属性 */
  properties: CanonicalNode;
  /** 结合能力绑定、几何与排版结果的消费上下文 */
  context: NodeGeometryContext;
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
  font: CanonicalFont;
  /** 正文对齐方式 */
  align: 'start' | 'middle' | 'end';
  /** 实际行高 */
  lineHeight: number;
  /** 物理行相对内容顶部的基线偏移 */
  baselineOffsets?: Array<number>;
} & (
  | { kind: 'plain'; lines: Array<CompiledNodeTextLineLayout> }
  | { kind: 'inline'; lines: Array<{ laid: InlineLineLayout; baselineOffset: number }> }
);

/** 节点完成测量和定位后的消费结果 */
export type NodeGeometryContext = {
  /** 已绑定的形状定义和参数 */
  shape: CanonicalNode['shape'];
  /** 已绑定的连接面定义和参数 */
  boundary: CanonicalNode['boundary'];
  /** 测量和定位结果 */
  geometry: NodeLayoutGeometry;
  /** 正文排版结果 */
  text?: CompiledNodeTextLayout;
  /** 已定位的附属标签 */
  labels?: Array<NodeLabelLayout>;
};

/** 已完成内容与视觉盒测量、尚未绑定 Node rect 的附属标签 */
export type MeasuredNodeLabel = {
  /** 混排计算结果 */
  laid?: Array<InlineLineLayout>;
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
