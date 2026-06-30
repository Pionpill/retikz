/**
 * 节点相对方向 8 方向常量（视觉语义）
 * @description above/below=y 减/增（视觉上/下）；left/right=x 减/增；4 对角分量 1/√2 让对角距离与 distance 等长。与 TikZ positioning 的 `above of` 等对齐（TikZ y 向上 retikz y 向下，但视觉语义一致）
 */
export const AtDirection = {
  Above: 'above',
  Below: 'below',
  Left: 'left',
  Right: 'right',
  AboveLeft: 'above-left',
  AboveRight: 'above-right',
  BelowLeft: 'below-left',
  BelowRight: 'below-right',
} as const;
