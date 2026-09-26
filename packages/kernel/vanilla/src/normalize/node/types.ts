import type {
  AnchorValue,
  IRAnchorPosition,
  IRAtPosition,
  IRBetweenPosition,
  IRNode,
  IRNodeLabel,
  IROffsetPosition,
  IRPosition,
  PolarPosition,
  SideValue,
} from '@retikz/core';

/** 作者侧相对定位输入 */
export type InputAtPosition = Omit<IRAtPosition, 'direction'> & {
  direction: AnchorValue;
};

/** 作者侧节点位置输入 */
export type InputPosition =
  | IRPosition
  | PolarPosition
  | IRAnchorPosition
  | InputAtPosition
  | IROffsetPosition
  | IRBetweenPosition;

/**
 * 作者侧节点标签边界位置
 * @description fraction 表示所选边界上的归一化位置，省略时使用 0.5
 */
export type InputNodeLabelBoundaryPosition = Omit<
  Extract<IRNodeLabel['position'], { boundary: string }>,
  'boundary'
> & {
  /** 标签附着的节点边界方向 */
  boundary: SideValue;
};

/** 作者侧节点标签位置 */
export type InputNodeLabelPosition =
  | Exclude<IRNodeLabel['position'], { boundary: string }>
  | InputNodeLabelBoundaryPosition;

/** 作者侧节点标签 */
export type InputNodeLabel = Omit<IRNodeLabel, 'position'> & {
  /** 标签位置；省略时位于节点上方，支持方向、角度或边界比例 */
  position?: InputNodeLabelPosition;
};

/** 作者侧节点输入 */
export type InputNode = Omit<IRNode, 'type' | 'position' | 'label'> & {
  /** 可选编译驱动解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
  /** 节点类别标识，可省略 */
  type?: 'node';
  /** 节点中心位置，支持坐标、相对定位和锚点对齐 */
  position: InputPosition;
  /** 附着于节点的一个或多个标签 */
  label?: InputNodeLabel | ReadonlyArray<InputNodeLabel>;
};
