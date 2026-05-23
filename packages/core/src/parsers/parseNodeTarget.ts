/**
 * 节点 ref 字符串 shorthand → NodeTarget 对象（单一真源）
 * @description React DSL / Draw way 层把 `'A'` / `'A.north'` / `'A.30'` 解析成对象 IR，core ir/compile 只见对象。
 *   `'A'`→`{id:'A'}`；`'A.<name>'`→命名 anchor（center/north/.../south-west）；`'A.<deg>'`→角度 anchor。
 *   按**第一个点**切分——含 `.` 的 id 不能用 shorthand，必须写对象 `{ id: 'a.b', anchor: 'north' }`。
 *   {side,t} 边上比例点是结构化新能力、shorthand 不表达（仅对象形态）。
 *   不命中 anchor 名抛错（避免静默吞拼写错误）。放 parser 层（非 compile）避免 adapter 反向依赖 compile。
 */

import { RECT_ANCHORS, type RectAnchor } from '../geometry/rect';
import type { IRNodeTarget } from '../ir';

/** RECT_ANCHORS 的 9 个 anchor 名 */
const ANCHOR_NAMES = new Set<string>(Object.values(RECT_ANCHORS));

/** 纯数字识别 `A.30` / `A.-45` / `A.180.5` */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** 字符串节点 ref shorthand → NodeTarget 对象 */
export const parseNodeTarget = (s: string): IRNodeTarget => {
  const dot = s.indexOf('.');
  if (dot < 0) return { id: s };
  const id = s.slice(0, dot);
  const tail = s.slice(dot + 1);
  if (ANGLE_RE.test(tail)) {
    return { id, anchor: Number(tail) };
  }
  if (!ANCHOR_NAMES.has(tail)) {
    throw new Error(
      `parseNodeTarget: unknown anchor '${tail}' in '${s}' (supports: ${[...ANCHOR_NAMES].join(', ')}); for ids containing '.', use the object form { id, anchor }`,
    );
  }
  return { id, anchor: tail as RectAnchor };
};
