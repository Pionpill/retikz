import type { JsonObject } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox, Position } from '@retikz/math';

import type { ConnectionEnvelopeKind, PathCommand, ShapeDefinition, TextLine } from '../../contract';
import type {
  CanonicalFont,
  CanonicalNode,
  CanonicalNodeLabel,
  NodeResolution,
  TextLineResolution,
} from '../../resolve';
import type { IRFont } from '../../schemas';
import type { CompileWarningCode } from '../constants';
import type { InlineLineLayout, TexLowerer, TextFont, TextMeasurer } from '../text';

/** 节点文本布局消费的字重，沿用 IR font weight 契约 */
type NodeFontWeight = NonNullable<IRFont['weight']>;

/** 连接面 provider 的几何实现契约 */
export type BoundaryGeometryDefinition = {
  /** provider 名称 */
  name: string;
  /** 返回与解析后 rect 同坐标系的精确闭合连接面轮廓；空数组表示合法空几何 */
  computeOutline?: (rect: CenteredBox, params: JsonObject) => ReadonlyArray<PathCommand>;
  /** 按方向求连接点 */
  computeBoundaryPoint: (rect: CenteredBox, toward: Position, params: JsonObject) => Position;
  /** 求命名 anchor */
  resolveAnchor?: (rect: CenteredBox, name: string, params: JsonObject) => Position | undefined;
};

/** 已按视觉 rect 解析出的连接面几何 */
export type BoundaryGeometryResolution = {
  /** 连接面 definition */
  def: BoundaryGeometryDefinition;
  /** provider 使用的连接面 rect */
  rect: CenteredBox;
  /** 已校验参数 */
  params: JsonObject;
};

/** 连接面几何解析所需的布局上下文 */
export type BoundaryGeometryResolveContext = {
  /** 节点视觉 shape definition */
  visualDef: ShapeDefinition;
  /** 节点视觉 shape rect */
  visualRect: CenteredBox;
  /** 节点视觉 shape 参数 */
  visualParams: JsonObject;
  /** 当前 node 的 IR 路径 */
  irPath?: string;
  /** shape-aware envelope 缓存 */
  connectionEnvelopeCache?: Map<string, CenteredBox>;
  /** tight fallback warning 去重集合 */
  connectionEnvelopeWarnings?: Set<ConnectionEnvelopeKind>;
  /** compile warning 分发函数 */
  warn?: (code: CompileWarningCode, message: string) => void;
};

/** 节点正文与附属 label 共享的文本布局上下文 */
export type NodeTextLayoutContext = {
  /** 待布局节点 */
  node: CanonicalNode;
  /** 文本度量函数 */
  measureText: TextMeasurer;
  /** TeX 降级上下文 */
  texLowering?: TexLoweringContext;
  /** 字体缩放 */
  fontScale: number;
  /** 继承字体族 */
  fontFamily?: string;
  /** 继承字重 */
  fontWeight?: NodeFontWeight;
  /** 继承字体样式 */
  fontStyle?: TextFont['style'];
};

/** 保持语义完整、正文与标签已确定化的节点属性 */
export type NodeResolvedProperties = Omit<CanonicalNode, 'text' | 'label'> & {
  /** 包含字体和外观的作者行解析结果 */
  text?: Array<TextLineResolution>;
  /** 按声明顺序排列的标签解析结果 */
  label?: Array<NodeLabelResolution>;
};

/** 字体及行内内容已确定化的标签属性 */
export type NodeLabelResolution = Omit<CanonicalNodeLabel, 'text' | 'font'> & {
  /** 已解析的正文内容 */
  text: Array<TextLineResolution>;
  /** 完成缩放后的有效字体 */
  font: CanonicalFont;
};

/** 分别持有有效属性与计算布局的节点编译状态 */
export type NodeCompilation = {
  /** 元素在 IR 树中的来源路径 */
  irPath: string;
  /** 当前有效语义属性 */
  properties: NodeResolvedProperties;
  /** 已计算的几何与排版结果 */
  layout: CompiledNodeLayout;
};

/** 物理行排版与其作者行的对应关系 */
export type NodeTextLineLayout = Omit<TextLine, 'fill' | 'opacity'> & {
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
export type NodeTextLayout = {
  /** 实际用于测量和输出的字体 */
  font: TextFont;
  /** 正文对齐方式 */
  align: 'start' | 'middle' | 'end';
  /** 实际行高 */
  lineHeight: number;
  /** 物理行相对内容顶部的基线偏移 */
  baselineOffsets?: Array<number>;
} & (
  | { kind: 'plain'; lines: Array<NodeTextLineLayout> }
  | { kind: 'inline'; lines: Array<{ laid: InlineLineLayout; baselineOffset: number }> }
);

/** 节点完成测量和定位后的消费结果 */
export type CompiledNodeLayout = {
  /** 用于匹配已解析连接面的作者配置 */
  boundarySource?: CanonicalNode['boundary'];
  /** 已绑定的形状定义和参数 */
  shape: NodeResolution['shape'];
  /** 已绑定的连接面定义和参数 */
  boundary: NodeResolution['boundary'];
  /** 测量和定位结果 */
  geometry: NodeLayoutGeometry;
  /** 正文排版结果 */
  text?: NodeTextLayout;
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

/** 公式渲染上下文 */
export type TexLoweringContext = {
  /** 将公式源码转换为可参与文本布局的结果；未提供时由公式布局分支处理缺失能力 */
  lowerTex?: TexLowerer;
  /** 分发公式降级或布局过程中产生的编译诊断 */
  warn: (code: CompileWarningCode, message: string) => void;
};
