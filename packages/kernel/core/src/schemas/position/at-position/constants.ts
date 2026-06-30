import type { WebAnchorValue } from '../../../geometry/anchor';

import { CompassAnchor, normalizeWebAnchor, WebAnchor } from '../../../geometry/anchor';

/**
 * 节点相对方向 8 方向常量（Web canonical）
 * @description top/bottom=y 减/增（视觉上/下）；left/right=x 减/增；4 对角分量 1/√2 让对角距离与 distance 等长。
 *   compass（north / south-west）和旧 positioning（above / below-left）写法作为输入别名归一到这里。
 */
export const AtDirection = WebAnchor;

export const LegacyAtDirectionAlias = {
  above: WebAnchor.Top,
  below: WebAnchor.Bottom,
  'above-left': WebAnchor.TopLeft,
  'above-right': WebAnchor.TopRight,
  'below-left': WebAnchor.BottomLeft,
  'below-right': WebAnchor.BottomRight,
} as const satisfies Record<string, WebAnchorValue>;

/** 标准化相对定位 / label 方向为 Web/CSS canonical 值。 */
export const normalizeAtDirection = (name: string): WebAnchorValue | undefined => {
  const web = normalizeWebAnchor(name);
  if (web !== undefined && web !== CompassAnchor.Center) return web;
  return LegacyAtDirectionAlias[name as keyof typeof LegacyAtDirectionAlias];
};
