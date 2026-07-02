import type {
  AnchorInput,
  AnchorValue,
  SideValue,
} from '../shared';

import {
  Anchor,
  CenterAnchor,
  Corner,
  isAnchor,
  isSide,
  Side,
} from '../shared';

const AnchorAliasToAnchor: Record<string, AnchorValue> = {
  north: Side.Top,
  south: Side.Bottom,
  east: Side.Right,
  west: Side.Left,
  'north-east': Corner.TopRight,
  'north-west': Corner.TopLeft,
  'south-east': Corner.BottomRight,
  'south-west': Corner.BottomLeft,
  above: Side.Top,
  below: Side.Bottom,
  'above-right': Corner.TopRight,
  'above-left': Corner.TopLeft,
  'below-right': Corner.BottomRight,
  'below-left': Corner.BottomLeft,
};

const SideAliasToSide: Record<string, SideValue> = {
  north: Side.Top,
  south: Side.Bottom,
  east: Side.Right,
  west: Side.Left,
  above: Side.Top,
  below: Side.Bottom,
};

/** node target sugar 错误提示中展示的 canonical 与别名候选名。 */
export const SupportedAnchorSugarNames = [
  CenterAnchor.Center,
  ...Object.values(Anchor),
  ...Object.keys(AnchorAliasToAnchor),
];

/** Parser sugar：把 compass / TikZ anchor 别名转换为 core canonical anchor。 */
export const parseAnchorAlias = (name: string): AnchorInput | undefined =>
  isAnchor(name) ? name : AnchorAliasToAnchor[name];

/** Parser sugar：把 compass / TikZ side 别名转换为 core canonical side。 */
export const parseSideAlias = (name: string): SideValue | undefined =>
  isSide(name) ? name : SideAliasToSide[name];
