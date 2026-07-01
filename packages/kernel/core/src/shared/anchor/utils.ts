import type {
  CenterAnchorValue,
  WebAnchorValue,
  WebSideValue,
} from './types';

import { CenterAnchor } from './constants';
import {
  CompassAnchorToWebAnchor,
  CompassSideToWebSide,
  TikzAnchorToWebAnchor,
  TikzSideToWebSide,
  WebAnchorValues,
  WebSideValues,
} from './indexes';

const WebAnchorSet = new Set<string>(WebAnchorValues);
const WebSideSet = new Set<string>(WebSideValues);
const CompassAnchorLookup: Partial<Record<string, WebAnchorValue>> = CompassAnchorToWebAnchor;
const TikzAnchorLookup: Partial<Record<string, WebAnchorValue>> = TikzAnchorToWebAnchor;
const CompassSideLookup: Partial<Record<string, WebSideValue>> = CompassSideToWebSide;
const TikzSideLookup: Partial<Record<string, WebSideValue>> = TikzSideToWebSide;

/** 将任意支持的 anchor 词汇归一为 canonical Web anchor 值。 */
export const normalizeAnchor = (name: string): WebAnchorValue | CenterAnchorValue | undefined => {
  if (name === CenterAnchor.Center) return CenterAnchor.Center;
  if (WebAnchorSet.has(name)) return name as WebAnchorValue;
  return CompassAnchorLookup[name] ?? TikzAnchorLookup[name];
};

/** 将任意支持的 side 词汇归一为 canonical Web side 值。 */
export const normalizeSide = (name: string): WebSideValue | undefined => {
  if (WebSideSet.has(name)) return name as WebSideValue;
  return CompassSideLookup[name] ?? TikzSideLookup[name];
};

/** 将相对定位 / label 方向输入归一为方位 Web anchor。 */
export const normalizeAtDirection = (name: string): WebAnchorValue | undefined => {
  const anchor = normalizeAnchor(name);
  return anchor !== CenterAnchor.Center ? anchor : undefined;
};
