/** 中心 anchor 独立于各方向 anchor 词汇，由消费方按场景单独处理 */
export const CenterAnchor = {
  Center: 'center',
} as const;

/** 标准直边方向名称，是 core 内部唯一 side 词汇 */
export const Side = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const;

/** 标准角方向名称，是 core 内部唯一 corner 词汇 */
export const Corner = {
  TopRight: 'top-right',
  TopLeft: 'top-left',
  BottomRight: 'bottom-right',
  BottomLeft: 'bottom-left',
} as const;

/** 标准方位 anchor 名称，是 core 内部唯一方向 anchor 词汇 */
export const Anchor = {
  ...Side,
  ...Corner,
} as const;
