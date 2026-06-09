import type { ValueOf } from '../types';

/** 9 个标准方位 anchor，采用 TikZ 语义作为 canonical 值。 */
export const CompassAnchor = {
  Center: 'center',
  North: 'north',
  South: 'south',
  East: 'east',
  West: 'west',
  NorthEast: 'north-east',
  NorthWest: 'north-west',
  SouthEast: 'south-east',
  SouthWest: 'south-west',
} as const;

export type CompassAnchorValue = ValueOf<typeof CompassAnchor>;

/** Web/CSS 心智下的方位 anchor 输入别名，编译前归一到 CompassAnchor。 */
export const WebAnchor = {
  Top: 'top',
  Bottom: 'bottom',
  Right: 'right',
  Left: 'left',
  TopRight: 'top-right',
  TopLeft: 'top-left',
  BottomRight: 'bottom-right',
  BottomLeft: 'bottom-left',
} as const;

export type WebAnchorValue = ValueOf<typeof WebAnchor>;

export type AnchorInput = CompassAnchorValue | WebAnchorValue;

const CompassAnchorSet = new Set<string>(Object.values(CompassAnchor));

const AnchorAliases: Record<WebAnchorValue, CompassAnchorValue> = {
  top: CompassAnchor.North,
  bottom: CompassAnchor.South,
  right: CompassAnchor.East,
  left: CompassAnchor.West,
  'top-right': CompassAnchor.NorthEast,
  'top-left': CompassAnchor.NorthWest,
  'bottom-right': CompassAnchor.SouthEast,
  'bottom-left': CompassAnchor.SouthWest,
};

/**
 * 标准化方位 anchor 名。
 * @description TikZ canonical 名原样返回；Web alias（top / top-left 等）归一到 north / north-west 等。
 */
export const normalizeCompassAnchor = (name: string): CompassAnchorValue | undefined => {
  if (CompassAnchorSet.has(name)) return name as CompassAnchorValue;
  return AnchorAliases[name as WebAnchorValue];
};

export const isCompassAnchorInput = (name: string): boolean =>
  normalizeCompassAnchor(name) !== undefined;
