import type { IRNodeTarget } from '@retikz/core';
import { Anchor, CenterAnchor, isAnchor } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';

/** 纯数字识别 `A.30` / `A.-45` / `A.180.5` */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

const DECIMAL_NUMBER_RE = /^-?\d+\.\d+$/;

/** 字符串节点 ref shorthand → NodeTarget 对象 */
export const parseNodeTarget = (s: string): IRNodeTarget => {
  if (DECIMAL_NUMBER_RE.test(s)) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `parseNodeTarget: '${s}' looks like a numeric coordinate; use [x, y] for coordinates or object form for ids containing '.'`,
    );
  }

  const dot = s.indexOf('.');
  const id = dot < 0 ? s : s.slice(0, dot);

  // 空 id（`''` / `'.top'`）fail-fast——否则产出 NodeTargetSchema 非法的 `{ id: '' }`，
  // 流到 compile 会误报"undefined node id ''"（拼写错误被当成缺节点）
  if (id.length === 0) {
    throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, `parseNodeTarget: empty node id in '${s}'`);
  }

  if (dot < 0) return { id };

  const tail = s.slice(dot + 1);
  if (ANGLE_RE.test(tail)) {
    return { id, anchor: Number(tail) };
  }

  if (!isAnchor(tail)) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      `parseNodeTarget: unknown anchor '${tail}' in '${s}' (supports: ${[CenterAnchor.Center, ...Object.values(Anchor)].join(', ')}); for ids containing '.' or shape-specific anchors, use the object form { id, anchor }`,
    );
  }

  return { id, anchor: tail };
};
