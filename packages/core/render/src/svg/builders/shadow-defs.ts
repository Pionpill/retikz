import type { DropShadow, ScenePrimitive } from '@retikz/core';
import type { SvgNode } from '../types';
import { compact } from './attrs';
import { hashKey } from './arrow-collect';

/** shadow color 缺省（半透明黑）；compile 通常已补，渲染端再兜一层 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

/**
 * 递归收集 scene 里所有几何图元（rect / ellipse / path）携带的已解析 DropShadow —— 按需注入 filter defs
 * @description 仅主几何图元带 shadow（compile 已保证 text / marker 不带）；group 递归。
 */
export const collectShadows = (prims: ReadonlyArray<ScenePrimitive>): Array<DropShadow> => {
  const out: Array<DropShadow> = [];
  const visit = (p: ScenePrimitive | undefined | null): void => {
    if (!p) return;
    if (p.type === 'rect' || p.type === 'ellipse' || p.type === 'path') {
      if (p.shadow) out.push(p.shadow);
    } else if (p.type === 'group') {
      for (const c of p.children) visit(c);
    }
  };
  for (const p of prims) visit(p);
  return out;
};

/**
 * DropShadow → 稳定字符串 key
 * @description 按固定字段顺序遍历（不依赖对象字面量字段顺序），相同 shadow → 同 key（dedup）。
 */
export const stableShadowKey = (s: DropShadow): string => {
  const parts: Array<string> = [];
  for (const field of ['offsetX', 'offsetY', 'blur', 'color', 'opacity'] as const) {
    const value = s[field];
    if (value !== undefined) parts.push(`${field}=${value}`);
  }
  return parts.join('|');
};

/** DropShadow → 短 hash（嵌入 SVG filter id 用） */
export const shadowHash = (s: DropShadow): string => hashKey(stableShadowKey(s));

/**
 * 一个 DropShadow → `<filter><feDropShadow></filter>` SvgNode
 * @description SVG `stdDeviation = blur / 2`（renderer 近似对齐口径，同 Canvas shadowBlur=blur）；
 *   `flood-color` 缺省半透明黑；`opacity`（若给）→ `flood-opacity`（相乘到有效 alpha）。
 *   `id` 已由 caller 加实例前缀。
 */
export const buildShadowDef = (s: DropShadow, id: string): SvgNode => ({
  tag: 'filter',
  attrs: { id },
  children: [
    {
      tag: 'feDropShadow',
      attrs: compact({
        dx: s.offsetX,
        dy: s.offsetY,
        stdDeviation: (s.blur ?? 0) / 2,
        'flood-color': s.color ?? DEFAULT_SHADOW_COLOR,
        'flood-opacity': s.opacity,
      }),
    },
  ],
});
