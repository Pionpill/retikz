import type { JsonObject } from '@retikz/foundation';
import type { CenteredBox, Position } from '@retikz/math';

import type { TextFont, TextMeasurer, ShapeDefinition } from '../../../contract';
import type { CanonicalFont, CanonicalNode, CanonicalNodeLabel, TextLineResolution } from '../../../resolve';
import type { IRFont } from '../../../schemas';
import type { CompiledNodeLayout } from '../../layout';
import type { CompileWarningCode } from '../../shared';
import type { TexLowerer } from '../../text';
import type { NodeBoundaryState } from './boundary-store';

/** 节点文本布局消费的字重，沿用 IR font weight 契约 */
type NodeFontWeight = NonNullable<IRFont['weight']>;

/** 连接面 provider 的几何实现契约 */
export type BoundaryGeometryDefinition = {
  /** provider 名称 */
  name: string;
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
export type BoundaryGeometryResolveContext = NodeBoundaryState & {
  /** 节点视觉 shape definition */
  visualDef: ShapeDefinition;
  /** 节点视觉 shape rect */
  visualRect: CenteredBox;
  /** 节点视觉 shape 参数 */
  visualParams: JsonObject;
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
export type CompiledNode = {
  /** 当前有效语义属性 */
  properties: NodeResolvedProperties;
  /** 已计算的几何与排版结果 */
  layout: CompiledNodeLayout;
};

/** 公式渲染上下文 */
export type TexLoweringContext = {
  /** 将公式源码转换为可参与文本布局的结果；未提供时由公式布局分支处理缺失能力 */
  lowerTex?: TexLowerer;
  /** 分发公式降级或布局过程中产生的编译诊断 */
  warn: (code: CompileWarningCode, message: string) => void;
};
