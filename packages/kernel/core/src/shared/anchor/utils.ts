import { CenterAnchor } from './constants';
import type { Anchor } from './constants';
import { anchorValues } from './indexes';

const anchorSet = new Set<string>(anchorValues);

/** 判断字符串是否为标准方向 anchor 或 center */
export const isAnchor = (name: string): name is CenterAnchor | Anchor =>
  name === CenterAnchor.Center || anchorSet.has(name);

/** 判断字符串是否为标准方向 anchor（不含 center） */
export const isDirectionalAnchor = (name: string): name is Anchor => anchorSet.has(name);
