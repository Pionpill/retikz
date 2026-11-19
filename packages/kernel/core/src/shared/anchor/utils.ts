import { CenterAnchor } from './constants';
import type { Anchor, Side } from './constants';
import { anchorValues, sideValues } from './indexes';

const anchorSet = new Set<string>(anchorValues);

const sideSet = new Set<string>(sideValues);

/** 判断字符串是否为标准方向 anchor 或 center */
export const isAnchor = (name: string): name is CenterAnchor | Anchor =>
  name === CenterAnchor.Center || anchorSet.has(name);

/** 判断字符串是否为标准方向 anchor（不含 center） */
export const isDirectionalAnchor = (name: string): name is Anchor => anchorSet.has(name);

/** 判断字符串是否为标准直边方向 */
export const isSide = (name: string): name is Side => sideSet.has(name);
