import { RECT_ANCHORS, type RectAnchor } from '../geometry/rect';

/** RECT_ANCHORS 的 9 个合法 anchor 名集合（成员校验用） */
const RECT_ANCHOR_SET = new Set<string>(Object.values(RECT_ANCHORS));

/**
 * 把任意字符串收窄为合法 RectAnchor，否则 undefined
 * @description 内置 4 shape 的 anchor 只认这 9 名；不在集合内返回 undefined，由 `anchorOf` 抛 Unknown anchor
 */
export const asRectAnchor = (name: string): RectAnchor | undefined =>
  RECT_ANCHOR_SET.has(name) ? (name as RectAnchor) : undefined;
