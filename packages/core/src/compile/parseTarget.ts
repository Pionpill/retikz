/**
 * 节点 ref 字符串扩展语法（ADR-0004）：
 *
 *   `'A'`         → 节点 A，由 path 自动 boundary clip（auto 模式）
 *   `'A.<name>'`  → 节点 A 的命名 anchor（center/north/south/east/west/north-east/...）
 *   `'A.<deg>'`   → 节点 A 在 degree 角度方向上的边界点（同 PolarPosition 角度约定）
 *
 * id 约束：`[A-Za-z_][\w-]*`——禁数字开头、禁含 `.`（与 anchor 分隔符冲突）；
 * anchor 名只接受 alpha.1 首批 9 个 RECT_ANCHORS（其余如 'text' / 'base' / 'mid'
 * 留 alpha.2 + 字体改造时再支持）；角度纯数字（含可选 `.`/`-`）。
 */

import { RECT_ANCHORS, type RectAnchor } from '../geometry/rect';

/** alpha.1 支持的 anchor 名集合（RECT_ANCHORS 的 9 个值） */
const ANCHOR_NAMES = new Set<string>(Object.values(RECT_ANCHORS));

/** 纯数字（可选小数 / 负号），用于识别 `A.30` / `A.-45` / `A.180.5` */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** 解析后的节点 ref 三态 */
export type ParsedNodeRef =
  | { kind: 'node'; id: string }
  | { kind: 'anchor'; id: string; anchor: RectAnchor }
  | { kind: 'angle'; id: string; angle: number };

/**
 * 解析节点 ref 字符串。
 *
 * - 不带 `.`：node（auto-clip）
 * - 带 `.` 后纯数字：angle（toward 方向上的边界点，与 PolarPosition 同角度约定）
 * - 带 `.` 后字母 / 连字符：anchor（命中 ANCHOR_NAMES 才合法，否则抛错）
 *
 * 抛错路径：未知 anchor 名（避免静默吞掉拼写错误）。
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
      `parseNodeRef: unknown anchor '${tail}' in '${s}' (alpha.1 supports: ${[...ANCHOR_NAMES].join(', ')})`,
    );
  }
  return { kind: 'anchor', id, anchor: tail as RectAnchor };
};
