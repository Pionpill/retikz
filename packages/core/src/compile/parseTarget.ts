/**
 * 节点 ref 字符串扩展语法
 * @description `'A'`→节点（auto boundary clip）；`'A.<name>'`→命名 anchor（center/north/.../north-east）；`'A.<deg>'`→角度方向边界点（同 PolarPosition 约定）。id 约束 `[A-Za-z_][\w-]*` 禁数字开头与 `.`；角度纯数字含可选 `.`/`-`
 */

import { RECT_ANCHORS, type RectAnchor } from '../geometry/rect';

/** RECT_ANCHORS 的 9 个 anchor 名 */
const ANCHOR_NAMES = new Set<string>(Object.values(RECT_ANCHORS));

/** 纯数字识别 `A.30` / `A.-45` / `A.180.5` */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** 节点 ref 解析后三态 */
export type ParsedNodeRef =
  | { kind: 'node'; id: string }
  | { kind: 'anchor'; id: string; anchor: RectAnchor }
  | { kind: 'angle'; id: string; angle: number };

/**
 * 解析节点 ref 字符串
 * @description 不带 `.`→node(auto-clip)；带 `.` 后纯数字→angle；带 `.` 后字母/连字符→anchor（不命中 ANCHOR_NAMES 抛错避免静默吞拼写错误）
 */
export const parseNodeRef = (s: string): ParsedNodeRef => {
  const dot = s.indexOf('.');
  if (dot < 0) return { kind: 'node', id: s };
  const id = s.slice(0, dot);
  const tail = s.slice(dot + 1);
  if (ANGLE_RE.test(tail)) {
    return { kind: 'angle', id, angle: Number(tail) };
  }
  if (!ANCHOR_NAMES.has(tail)) {
    throw new Error(
      `parseNodeRef: unknown anchor '${tail}' in '${s}' (supports: ${[...ANCHOR_NAMES].join(', ')})`,
    );
  }
  return { kind: 'anchor', id, anchor: tail as RectAnchor };
};
