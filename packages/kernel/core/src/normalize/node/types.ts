import type { BoundsInsets } from '@retikz/math';

import type {
  IRLineSpec,
  IRNode,
  IRNodeLabel,
  IRNodeLabelBoundaryPosition,
  NodeLabelPlacementValue,
  NodeLabelPositionValue,
  NodeTextAlignValue,
  ResolvedDropShadow,
  StrokeDashPattern,
} from '../../schemas';

/** 已补齐边界比例的节点标签位置 */
export type CanonicalNodeLabelBoundaryPosition = Omit<IRNodeLabelBoundaryPosition, 'fraction'> & {
  /** 边界上的归一化位置 */
  fraction: number;
};

/** 展开静态位置与放置默认值后的节点标签 */
export type CanonicalNodeLabel = Omit<IRNodeLabel, 'position' | 'placement'> & {
  /** 标签附着位置 */
  position: NodeLabelPositionValue | number | CanonicalNodeLabelBoundaryPosition;
  /** 标签相对附着点的放置方向 */
  placement: NodeLabelPlacementValue;
};

/** 展开 Node 紧凑写法与静态默认值后的完整内部形态 */
export type CanonicalNode = Omit<
  IRNode,
  | 'padding'
  | 'margin'
  | 'minimumSize'
  | 'scale'
  | 'text'
  | 'label'
  | 'align'
  | 'rotate'
  | 'dashed'
  | 'dotted'
  | 'dashPattern'
  | 'shadow'
> & {
  /** 完整内边距 */
  padding: BoundsInsets;
  /** 完整外边距 */
  margin: BoundsInsets;
  /** 完整最小尺寸 */
  minimumSize: {
    /** 最小宽度 */
    width: number;
    /** 最小高度 */
    height: number;
  };
  /** 完整轴向缩放 */
  scale: {
    /** x 轴缩放 */
    x: number;
    /** y 轴缩放 */
    y: number;
  };
  /** 多行正文 */
  text?: Array<IRLineSpec>;
  /** 已按数组形态展开的附属标签 */
  label?: Array<CanonicalNodeLabel>;
  /** 正文对齐 */
  align: NodeTextAlignValue;
  /** 节点旋转角度 */
  rotate: number;
  /** 已解析的边框虚线样式 */
  dashPattern?: StrokeDashPattern;
  /** 已展开预设与静态默认值的投影 */
  shadow?: ResolvedDropShadow;
};
