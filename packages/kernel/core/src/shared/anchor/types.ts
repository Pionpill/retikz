import type { Anchor, CenterAnchor, Side } from './constants';

export type InputSide = Side;

/** 可用于定位的中心锚点或八方向边界锚点 */
export type InputAnchor = CenterAnchor | Anchor;

export type InputDirectionalAnchor = Anchor;
