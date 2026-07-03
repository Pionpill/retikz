import type {
  AnchorInput,
  DirectionalAnchorInput,
  SideValue,
} from './types';

import { CenterAnchor } from './constants';
import {
  AnchorValues,
  SideValues,
} from './indexes';

const AnchorSet = new Set<string>(AnchorValues);
const SideSet = new Set<string>(SideValues);

/** 判断字符串是否为标准方向 anchor 或 center。 */
export const isAnchor = (name: string): name is AnchorInput => name === CenterAnchor.Center || AnchorSet.has(name);

/** 判断字符串是否为标准方向 anchor（不含 center）。 */
export const isDirectionalAnchor = (name: string): name is DirectionalAnchorInput => AnchorSet.has(name);

/** 判断字符串是否为标准直边方向。 */
export const isSide = (name: string): name is SideValue => SideSet.has(name);
