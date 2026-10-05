import type { Anchor, CenterAnchor, Side } from './constants';

export type SideInput = Side;

/** 可用于定位的中心锚点或八方向边界锚点 */
export type AnchorInput = CenterAnchor | Anchor;

export type DirectionalAnchorInput = Anchor;
