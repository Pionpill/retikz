import type { IRTarget } from '../ir';
import { parseNodeTarget } from './node-target';

/** TikZ 风格相对偏移字面量正则：捕获 `+` / `++` 前缀 + dx / dy 数值 */
const RELATIVE_OFFSET_RE = /^(\+{1,2})\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

/**
 * Sugar 字符串解析：TikZ 风格字符串 shorthand → IR 对象（React DSL 层；core IR 只见对象）
 * @description `'+dx,dy'` → `{relative:[dx,dy]}`（TikZ `+`，不更新 prevEnd）；`'++dx,dy'` → `{relativeAccumulate:[dx,dy]}`（TikZ `++`，累积）；
 *   其余字符串作节点 ref 经 `parseNodeTarget` 转 `{ id, anchor? }`（`'A'` / `'A.north'` / `'A.30'`）；非字符串（笛卡尔 / 极坐标 / 已是对象）原样返回。
 *   纯函数无 nodeIndex 依赖，react adapter 与 Draw DSL 共用。core schema 已无字符串 target 分支——eager 解析后才入 IR。
 */
export const parseTargetSugar = (input: unknown): IRTarget => {
  if (typeof input !== 'string') return input as IRTarget;
  const match = input.match(RELATIVE_OFFSET_RE);
  if (!match) return parseNodeTarget(input);
  const plus = match[1];
  const dx = Number(match[2]);
  const dy = Number(match[3]);
  if (plus === '++') {
    return { relativeAccumulate: [dx, dy] };
  }
  return { relative: [dx, dy] };
};
