import type { ValueOf } from '../types';

/** TikZ / compass 心智下的边界 side 值。 */
export const CompassSide = {
  North: 'north',
  South: 'south',
  East: 'east',
  West: 'west',
} as const;

export type CompassSideValue = ValueOf<typeof CompassSide>;

/** TikZ / compass 心智下的角点值。 */
export const CompassCorner = {
  NorthEast: 'north-east',
  NorthWest: 'north-west',
  SouthEast: 'south-east',
  SouthWest: 'south-west',
} as const;

export type CompassCornerValue = ValueOf<typeof CompassCorner>;

/** 9 个标准方位 anchor，采用 TikZ / compass 命名。 */
export const CompassAnchor = {
  Center: 'center',
  ...CompassSide,
  ...CompassCorner,
} as const;

export type CompassAnchorValue = ValueOf<typeof CompassAnchor>;

/** Web/CSS 心智下的边界 side canonical 值。 */
export const WebSide = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const;

export type WebSideValue = ValueOf<typeof WebSide>;

/** Web/CSS 心智下的角点 canonical 值。 */
export const WebCorner = {
  TopRight: 'top-right',
  TopLeft: 'top-left',
  BottomRight: 'bottom-right',
  BottomLeft: 'bottom-left',
} as const;

export type WebCornerValue = ValueOf<typeof WebCorner>;

/** Web/CSS 心智下的方位 anchor canonical 值（不含 center）。 */
export const WebAnchor = {
  ...WebSide,
  ...WebCorner,
} as const;

export type WebAnchorValue = ValueOf<typeof WebAnchor>;

export type AnchorInput = CompassAnchorValue | WebAnchorValue;

const CompassAnchorSet = new Set<string>(Object.values(CompassAnchor));
const WebSideSet = new Set<string>(Object.values(WebSide));
const WebAnchorSet = new Set<string>(Object.values(WebAnchor));

const CompassAnchorAliases: Record<WebAnchorValue, CompassAnchorValue> = {
  top: CompassAnchor.North,
  bottom: CompassAnchor.South,
  right: CompassAnchor.East,
  left: CompassAnchor.West,
  'top-right': CompassAnchor.NorthEast,
  'top-left': CompassAnchor.NorthWest,
  'bottom-right': CompassAnchor.SouthEast,
  'bottom-left': CompassAnchor.SouthWest,
};

const WebAnchorAliases: Record<CompassAnchorValue, WebAnchorValue | typeof CompassAnchor.Center> = {
  center: CompassAnchor.Center,
  north: WebAnchor.Top,
  south: WebAnchor.Bottom,
  east: WebAnchor.Right,
  west: WebAnchor.Left,
  'north-east': WebAnchor.TopRight,
  'north-west': WebAnchor.TopLeft,
  'south-east': WebAnchor.BottomRight,
  'south-west': WebAnchor.BottomLeft,
};

const CompassSideAliases: Record<CompassSideValue, WebSideValue> = {
  north: WebSide.Top,
  south: WebSide.Bottom,
  east: WebSide.Right,
  west: WebSide.Left,
};

/**
 * 标准化方位 anchor 名。
 * @description compass 名原样返回；Web 名（top / top-left 等）归一到 north / north-west 等。
 */
export const normalizeCompassAnchor = (name: string): CompassAnchorValue | undefined => {
  if (CompassAnchorSet.has(name)) return name as CompassAnchorValue;
  return CompassAnchorAliases[name as WebAnchorValue];
};

/**
 * 标准化方位 anchor 名为 Web/CSS canonical 值。
 * @description Web 名原样返回；compass 名（north / north-west 等）作为输入别名归一到 top / top-left 等。
 */
export const normalizeWebAnchor = (name: string): WebAnchorValue | typeof CompassAnchor.Center | undefined => {
  if (name === CompassAnchor.Center) return CompassAnchor.Center;
  if (WebAnchorSet.has(name)) return name as WebAnchorValue;
  return WebAnchorAliases[name as CompassAnchorValue];
};

/** 标准化边界 side 名为 Web/CSS canonical 值。 */
export const normalizeWebSide = (name: string): WebSideValue | undefined => {
  if (WebSideSet.has(name)) return name as WebSideValue;
  return CompassSideAliases[name as CompassSideValue];
};

/** Web/CSS side → 几何层 compass side。 */
export const webSideToCompassSide = (side: WebSideValue): CompassSideValue => {
  switch (side) {
    case WebSide.Top:
      return CompassSide.North;
    case WebSide.Right:
      return CompassSide.East;
    case WebSide.Bottom:
      return CompassSide.South;
    case WebSide.Left:
      return CompassSide.West;
  }
};
