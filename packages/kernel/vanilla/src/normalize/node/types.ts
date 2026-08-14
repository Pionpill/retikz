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

/** 作者侧节点标签边界位置 */
export type InputNodeLabelBoundaryPosition = Omit<
  Extract<IRNodeLabel['position'], { boundary: string }>,
  'boundary'
> & {
  boundary: SideValue;
};

/** 作者侧节点标签位置 */
export type InputNodeLabelPosition =
  | Exclude<IRNodeLabel['position'], { boundary: string }>
  | InputNodeLabelBoundaryPosition;

/** 作者侧节点标签 */
export type InputNodeLabel = Omit<IRNodeLabel, 'position'> & {
  position?: InputNodeLabelPosition;
};

/** 作者侧节点输入 */
export type InputNode = Omit<IRNode, 'type' | 'position' | 'label'> & {
  type?: 'node';
  position: InputPosition;
  label?: InputNodeLabel | ReadonlyArray<InputNodeLabel>;
};
