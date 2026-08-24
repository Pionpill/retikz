import { Anchor } from '../../shared';

/** Node 文字颜色的宿主专用关键字 */
export const NodeTextColor = {
  /** 根据静态不透明 fill 自动选择黑色或白色 */
  Contrast: 'contrast',
} as const;

/** 节点标签相对节点的位置关键字 */
export const NodeLabelPosition = {
  ...Anchor,
  Center: 'center',
} as const;

/** 节点标签放置在节点边界内侧或外侧 */
export const NodeLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

/** 节点标签自身旋转模式 */
export const NodeLabelRotateMode = {
  /** 保持文字正立，不随标签位置旋转 */
  None: 'none',
  /** 沿节点中心到标签中心的径向方向旋转 */
  Radial: 'radial',
  /** 沿径向方向的切线方向旋转 */
  Tangent: 'tangent',
} as const;
