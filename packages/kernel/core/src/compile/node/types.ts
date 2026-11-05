import type { PropertyPath, WithRequiredProperties } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox, Position } from '@retikz/math';

import type {
  TextFont,
  LayoutAxisProposal,
  Transform,
  TextLine,
  TextMeasurer,
  LayoutAlignmentGuide,
  ScenePrimitive,
} from '../../contract';
import type { CanonicalNode } from '../../resolve';
import type { CanonicalDropShadow } from '../../schemas';
import type { BoundaryState } from '../boundary';
import type { PositionTargetEvaluateContext } from '../reference';
import type { RegisterPaint } from '../resource';
import type { ComposedScopeTransform, CompileWarningCode } from '../shared';
import type { CompiledTextBlockLayout, CompiledTextBlockLine, TexLowerer } from '../text';
import type { NodeContentLayout } from './content';

/** 节点编译结果，保留整体输出与可供调用方选择复用的阶段产物 */
export type CompiledNode = {
  /** 当前形状的能力绑定，直接来自 canon */
  shape: CanonicalNode['shape'];
  /** 当前连接面的能力绑定，直接来自 canon */
  boundary: CanonicalNode['boundary'];
  /** 整体布局与本次已知的局部布局产物 */
  layout: WithRequiredProperties<PreparedNodeLayout, 'overall'>;
  /** 最终输出与本次已知的局部绘制产物 */
  emit: WithRequiredProperties<PreparedNodeEmit, 'overall'>;
  /** 可供父布局读取的对齐线 */
  alignmentGuides?: Array<LayoutAlignmentGuide>;
};

/** 公式渲染上下文 */
type TexLoweringContext = {
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
      lines: Array<CompiledTextBlockLine>;
    }
);

/** 节点测量、定位和标签排版的计算结果 */
export type CompiledNodeLayout = {
  /** 测量和定位结果 */
  geometry: NodeLayoutGeometry;
  /** 正文排版结果 */
  text?: CompiledNodeTextLayout;
  /** 已定位的附属标签 */
  labels?: Array<NodeLabelLayout>;
};

/** 应用节点尺寸约束后的形状布局，不包含节点位置 */
export type NodeShapeLayout = {
  /** 最终正文排版采用的宽度预算；省略表示不限制宽度 */
  contentWidthBudget?: number;
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
  /** 已适用于当前最终宽度条件的正文排版 */
  content?: NodeContentLayout;
  /** 已适用于当前内容和节点约束的形状尺寸 */
  shape?: NodeShapeLayout;
  /** 最终节点位置；缺省时读取当前定位依赖 */
  placement?: NodePlacement;
  /** 与当前 Canonical 标签顺序对应的阶段产物；缺项按需计算 */
  labels?: Array<PreparedNodeLabelLayout>;
};

/** 调用方保证适用于当前输入与上下文的节点阶段产物 */
export type PreparedNodeCompilation = {
  /** 完整或部分布局产物，缺失阶段由 Core 执行 */
  layout?: PreparedNodeLayout;
  /** 已确认有效的绘制结果；调用方同时恢复其引用资源 */
  emit?: PreparedNodeEmit;
};

/** 已完成内容与视觉盒测量、尚未绑定 Node rect 的附属标签 */
export type MeasuredNodeLabel = {
  /** 混排计算结果 */
  lineLayout: CompiledTextBlockLayout;
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

/** 节点最终图元与布局边界贡献 */
export type NodeEmitOutput = {
  /** 已完成分组、变换和身份绑定的图元 */
  primitives: Array<ScenePrimitive>;
  /** 布局与视觉范围使用的边界贡献 */
  bounds: Array<{ boundsPoints: Array<Position>; shadow?: CanonicalDropShadow }>;
};

/** 调用方确认有效的单个标签绘制结果 */
export type PreparedNodeLabelEmit = {
  /** 完整图元；缺省时重新绘制该标签 */
  overall?: Array<ScenePrimitive>;
};

/** 调用方保证适用于当前布局、外观、圆整与资源环境的绘制产物 */
export type PreparedNodeEmit = {
  /** 最终完整输出；命中时跳过局部绘制和整体组装 */
  overall?: NodeEmitOutput;
  /** 正文图元；空绘制结果表示已计算的空正文 */
  content?: Array<ScenePrimitive>;
  /** 形状 provider 输出的图元结构及外观 */
  shape?: Array<ScenePrimitive>;
  /** 按当前标签顺序对应的绘制结果，空对象表示需要计算 */
  labels?: Array<PreparedNodeLabelEmit>;
};
