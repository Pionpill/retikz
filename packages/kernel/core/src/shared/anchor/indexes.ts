import type {
  AnchorValue,
  CornerValue,
  SideValue,
} from './types';

import {
  Corner,
  Side,
} from './constants';

export const SideValues = [
  Side.Top,
  Side.Right,
  Side.Bottom,
  Side.Left,
] as const satisfies Readonly<Array<SideValue>>;

export const CornerValues = [
  Corner.TopRight,
  Corner.TopLeft,
  Corner.BottomRight,
  Corner.BottomLeft,
] as const satisfies Readonly<Array<CornerValue>>;

export const AnchorValues = [
  ...SideValues,
  ...CornerValues,
] as const satisfies Readonly<Array<AnchorValue>>;
