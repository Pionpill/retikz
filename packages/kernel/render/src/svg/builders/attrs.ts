import type { SvgAttrs } from '../types';

/**
 * 丢弃值为 `undefined` 的属性键
 * @description builder 用「全列出、缺省 undefined」的写法拼 attrs；本 helper 把 undefined 项删掉，让
 *   `SvgNode.attrs` 只含真正出现的属性——序列化逐字吐、测试断言「某属性不存在」都依赖这个干净性
 *   （对齐 React「undefined prop 不渲染」的行为）。
 */
export const compact = (attrs: SvgAttrs): SvgAttrs => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined) out[k] = v;
  }
  return out as SvgAttrs;
};
