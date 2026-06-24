import type { ArrowEndSpec, AssertEqual, ScenePrimitive } from '@retikz/core';

/** 递归收集 scene 里所有 PathPrim 用到的 arrow 端点 spec —— 按需注入 marker defs */
export const collectArrowSpecs = (prims: ReadonlyArray<ScenePrimitive>): Array<ArrowEndSpec> => {
  const out: Array<ArrowEndSpec> = [];
  const visit = (p: ScenePrimitive | undefined | null): void => {
    // 防御：上游（如非法 IR、有空槽位的 group.children）可能塞 undefined，命中后直接 noop，别让属性访问抛
    if (!p) return;
    if (p.type === 'path') {
      if (p.arrowStart) out.push(p.arrowStart);
      if (p.arrowEnd) out.push(p.arrowEnd);
    } else if (p.type === 'group') {
      for (const c of p.children) visit(c);
    }
  };
  for (const p of prims) visit(p);
  return out;
};

/**
 * `ArrowEndSpec`（已解析 marker 描述）除必填 `shape` 外的全部字段表——`stableSpecKey` 遍历此表拼 key
 * @description `as const satisfies` 拒不存在的 key；下方静态校验完备性——未来 `ArrowEndSpec` 加新字段时此表
 *   漏写 TS 编译期报错，防「字段表漂移」。spec 字段集为 wrapper 参数（baseSize / refX / markerWidth /
 *   markerHeight / opacity）+ 已解析几何（marker）。
 */
const ARROW_END_SPEC_KEY_FIELDS = [
  'baseSize',
  'refX',
  'markerWidth',
  'markerHeight',
  'opacity',
  'marker',
] as const satisfies ReadonlyArray<keyof ArrowEndSpec>;

// 类型层完备性互锁：字段表必须覆盖 ArrowEndSpec 除 `shape` 外的所有 key（漏 / 多 字段 TS 报错）
type _KeyFieldsCheck = AssertEqual<
  (typeof ARROW_END_SPEC_KEY_FIELDS)[number],
  Exclude<keyof ArrowEndSpec, 'shape'>
>;
const _assertKeyFieldsCheck: _KeyFieldsCheck = true;
void _assertKeyFieldsCheck;

/**
 * spec → 稳定字符串 key
 * @description 必填 `shape` 头部输出，其余字段按 `ARROW_END_SPEC_KEY_FIELDS` 顺序遍历——不依赖对象字面量
 *   字段顺序、不漏字段；标量直接拼，`marker`（结构化几何数组）走 JSON.stringify。不同 spec → 不同 key、
 *   相同 spec → 同 key（dedup）。
 */
export const stableSpecKey = (spec: ArrowEndSpec): string => {
  const parts: Array<string> = [`shape=${spec.shape}`];
  for (const field of ARROW_END_SPEC_KEY_FIELDS) {
    const value = spec[field];
    if (value === undefined) continue;
    parts.push(`${field}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
  }
  return parts.join('|');
};

/**
 * key → 短 hash（SVG id 中可安全嵌入的 ascii；non-cryptographic）
 * @description djb2 变体；只用十六进制末 8 位避免 id 过长。同 spec → 同 hash、不同 spec → 不同 hash
 *   （碰撞概率极低，且 id 前缀已带实例隔离，不会跨 svg 串话）。
 */
export const hashKey = (key: string): string => {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};
