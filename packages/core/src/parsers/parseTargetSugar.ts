import type { IRTarget } from '../ir';

/**
 * Sugar 字符串解析：识别 TikZ 风格的相对偏移字面量，把 `'+1,0'` /
 * `'++1.5,-2'` 这类字符串转成 IR 的 { rel } / { relAccumulate } 对象；
 * 其它形态（节点 id `'A'` / `'A.north'`、笛卡尔元组、极坐标对象、已经
 * 是 rel/relAccumulate 对象）原样返回。
 *
 * 语法：
 * - `'+<dx>,<dy>'`     → `{ rel: [dx, dy] }`           （TikZ `+` 语义，不更新 prevEnd）
 * - `'++<dx>,<dy>'`    → `{ relAccumulate: [dx, dy] }` （TikZ `++` 语义，累积更新）
 * - `<dx>` / `<dy>`：可带正负号小数，如 `'+1,0'` / `'++1.5,-2.5'` / `'+ -3, 4'`
 *
 * 不匹配的字符串（如 `'A'` / `'A.north'` / `'A.30'`）原样返回——首字母为字母时
 * 不会撞 `+` 前缀；含 `.` 但不含 `,` 的也不撞。
 *
 * 这是纯函数，没有 nodeIndex 依赖，住在 core/parsers，react adapter 与
 * Draw way DSL 共用。
 */
const REL_RE = /^(\+{1,2})\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

export const parseTargetSugar = (input: unknown): IRTarget => {
  if (typeof input !== 'string') return input as IRTarget;
  const match = input.match(REL_RE);
  if (!match) return input;
  const plus = match[1];
  const dx = Number(match[2]);
  const dy = Number(match[3]);
  if (plus === '++') {
    return { relAccumulate: [dx, dy] };
  }
  return { rel: [dx, dy] };
};
