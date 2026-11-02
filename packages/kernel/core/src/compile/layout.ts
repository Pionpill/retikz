import type { BoundsInsets, CenteredBox, Position } from '@retikz/math';

import type { TextFont, TextLine } from '../contract';
import type { CanonicalNode, NodeResolution } from '../resolve';
import type { IRPosition, CanonicalDropShadow } from '../schemas';
import type { InlineLineLayout } from './text';

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

/** 自动 viewBox 的当前 frame 几何贡献 */
export type LayoutBoundsContribution = {
  /** 包络装饰的可见范围，需要沿祖先裁剪收敛 */
  decoration?: true;
  /** 当前 frame 中的几何点 */
  boundsPoints: Array<IRPosition>;
  /** 与该点集关联的阴影外溢 */
  shadow?: CanonicalDropShadow;
  /** 位于该显式 composite allocation boundary 内时不直接贡献到外层 */
  allocationBoundary?: object;
};
