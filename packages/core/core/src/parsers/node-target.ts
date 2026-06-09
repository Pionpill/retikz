/**
 * 节点 ref 字符串 shorthand → NodeTarget 对象（单一真源）
 * @description React DSL / Draw way 层把 `'A'` / `'A.north'` / `'A.30'` 解析成对象 IR，core ir/compile 只见对象。
 *   `'A'`→`{id:'A'}`；`'A.<name>'`→命名 anchor（center/north/.../south-west 或 top/top-left 等别名）；`'A.<deg>'`→角度 anchor。
 *   按**第一个点**切分——含 `.` 的 id 不能用 shorthand，必须写对象 `{ id: 'a.b', anchor: 'north' }`。
 *   {side,t} 边上比例点是结构化新能力、shorthand 不表达（仅对象形态）。
 *   字符串 shorthand 只认标准方位 anchor 与 Web 方位别名（提前拦拼写错误）；shape 自定义 anchor（如 sector 的
 *   `outer-arc-mid`）走对象形态 `{ id, anchor: 'outer-arc-mid' }`，由 compile 据目标 shape 解释。
 *   放 parser 层（非 compile）避免 adapter 反向依赖 compile。
 */

import {
  CompassAnchor,
  WebAnchor,
  normalizeCompassAnchor,
} from '../geometry/anchor';
import type { IRNodeTarget } from '../ir';

const SUPPORTED_ANCHOR_NAMES = [
  ...Object.values(CompassAnchor),
  ...Object.values(WebAnchor),
];

/** 纯数字识别 `A.30` / `A.-45` / `A.180.5` */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** 字符串节点 ref shorthand → NodeTarget 对象 */
export const parseNodeTarget = (s: string): IRNodeTarget => {
  const dot = s.indexOf('.');
  const id = dot < 0 ? s : s.slice(0, dot);
  // 空 id（`''` / `'.north'`）fail-fast——否则产出 NodeTargetSchema 非法的 `{ id: '' }`，
  // 流到 compile 会误报"undefined node id ''"（拼写错误被当成缺节点）
  if (id.length === 0) {
    throw new Error(`parseNodeTarget: empty node id in '${s}'`);
  }
  if (dot < 0) return { id };
  const tail = s.slice(dot + 1);
  if (ANGLE_RE.test(tail)) {
    return { id, anchor: Number(tail) };
  }
  const anchor = normalizeCompassAnchor(tail);
  if (anchor === undefined) {
    throw new Error(
      `parseNodeTarget: unknown anchor '${tail}' in '${s}' (supports: ${SUPPORTED_ANCHOR_NAMES.join(', ')}); for ids containing '.' or shape-specific anchors, use the object form { id, anchor }`,
    );
  }
  return { id, anchor };
};
