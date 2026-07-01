import type {
  CompassAnchorValue,
  CompassCornerValue,
  CompassSideValue,
  TikzAnchorValue,
  TikzCornerValue,
  TikzSideValue,
  WebAnchorValue,
  WebCornerValue,
  WebSideValue,
} from './types';

import {
  CompassCorner,
  CompassSide,
  TikzCorner,
  TikzSide,
  WebCorner,
  WebSide,
} from './constants';

export const WebSideValues = [
  WebSide.Top,
  WebSide.Right,
  WebSide.Bottom,
  WebSide.Left,
] as const satisfies Readonly<Array<WebSideValue>>;

export const WebCornerValues = [
  WebCorner.TopRight,
  WebCorner.TopLeft,
  WebCorner.BottomRight,
  WebCorner.BottomLeft,
] as const satisfies Readonly<Array<WebCornerValue>>;

export const WebAnchorValues = [
  ...WebSideValues,
  ...WebCornerValues,
] as const satisfies Readonly<Array<WebAnchorValue>>;

export const CompassSideValues = [
  CompassSide.North,
  CompassSide.South,
  CompassSide.East,
  CompassSide.West,
] as const satisfies Readonly<Array<CompassSideValue>>;

export const CompassCornerValues = [
  CompassCorner.NorthEast,
  CompassCorner.NorthWest,
  CompassCorner.SouthEast,
  CompassCorner.SouthWest,
] as const satisfies Readonly<Array<CompassCornerValue>>;

export const CompassAnchorValues = [
  ...CompassSideValues,
  ...CompassCornerValues,
] as const satisfies Readonly<Array<CompassAnchorValue>>;

export const TikzSideValues = [
  TikzSide.Above,
  TikzSide.Below,
  TikzSide.Right,
  TikzSide.Left,
] as const satisfies Readonly<Array<TikzSideValue>>;

export const TikzCornerValues = [
  TikzCorner.AboveRight,
  TikzCorner.AboveLeft,
  TikzCorner.BelowRight,
  TikzCorner.BelowLeft,
] as const satisfies Readonly<Array<TikzCornerValue>>;

export const TikzAnchorValues = [
  ...TikzSideValues,
  ...TikzCornerValues,
] as const satisfies Readonly<Array<TikzAnchorValue>>;

/** Compass 风格 anchor 到 Web/CSS canonical anchor 的映射。 */
export const CompassAnchorToWebAnchor: Record<CompassAnchorValue, WebAnchorValue> = {
  [CompassSide.North]: WebSide.Top,
  [CompassSide.South]: WebSide.Bottom,
  [CompassSide.East]: WebSide.Right,
  [CompassSide.West]: WebSide.Left,
  [CompassCorner.NorthEast]: WebCorner.TopRight,
  [CompassCorner.NorthWest]: WebCorner.TopLeft,
  [CompassCorner.SouthEast]: WebCorner.BottomRight,
  [CompassCorner.SouthWest]: WebCorner.BottomLeft,
};

/** TikZ positioning 风格 anchor 到 Web/CSS canonical anchor 的映射。 */
export const TikzAnchorToWebAnchor: Record<TikzAnchorValue, WebAnchorValue> = {
  [TikzSide.Above]: WebSide.Top,
  [TikzSide.Below]: WebSide.Bottom,
  [TikzSide.Right]: WebSide.Right,
  [TikzSide.Left]: WebSide.Left,
  [TikzCorner.AboveRight]: WebCorner.TopRight,
  [TikzCorner.AboveLeft]: WebCorner.TopLeft,
  [TikzCorner.BelowRight]: WebCorner.BottomRight,
  [TikzCorner.BelowLeft]: WebCorner.BottomLeft,
};

export const CompassSideToWebSide: Record<CompassSideValue, WebSideValue> = {
  [CompassSide.North]: WebSide.Top,
  [CompassSide.South]: WebSide.Bottom,
  [CompassSide.East]: WebSide.Right,
  [CompassSide.West]: WebSide.Left,
};

export const TikzSideToWebSide: Record<TikzSideValue, WebSideValue> = {
  [TikzSide.Above]: WebSide.Top,
  [TikzSide.Below]: WebSide.Bottom,
  [TikzSide.Right]: WebSide.Right,
  [TikzSide.Left]: WebSide.Left,
};
