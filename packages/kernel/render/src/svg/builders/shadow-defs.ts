import type { IRDropShadow, ScenePrimitive } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';

import type { SvgNode } from '../types';

import { hashKey } from './arrow-collect';
import { compact } from './attrs';

/** shadow color 缺省（半透明黑）；compile 通常已补，渲染端再兜一层 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

/**
 * 递归收集 scene 里所有几何图元（rect / ellipse / path）携带的已解析 IRDropShadow —— 按需注入 filter defs
 * @description 仅主几何图元带 shadow（compile 已保证 text / marker 不带）；group 递归。
 */
export const collectShadows = (prims: ReadonlyArray<ScenePrimitive>): Array<IRDropShadow> => {
  const out: Array<IRDropShadow> = [];
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
 * IRDropShadow → 稳定字符串 key
 * @description 按固定字段顺序遍历（不依赖对象字面量字段顺序），相同 shadow → 同 key（dedup）。
 */
export const stableShadowKey = (s: IRDropShadow): string => {
  const parts: Array<string> = [];
  for (const field of ['offsetX', 'offsetY', 'blur', 'color', 'opacity'] as const) {
    const value = s[field];
    if (value !== undefined) parts.push(`${field}=${value}`);
  }
  return parts.join('|');
};

/** IRDropShadow → 短 hash（嵌入 SVG filter id 用） */
export const shadowHash = (s: IRDropShadow): string => hashKey(stableShadowKey(s));

/** 以 shadow 的位移 + 模糊半径外扩 filter region，避免大档位投影被 viewBox 边缘裁掉 */
const shadowRegion = (s: IRDropShadow, region: BoundsRect): BoundsRect => {
  const dx = s.offsetX ?? 0;
  const dy = s.offsetY ?? 0;
  const blur = s.blur ?? 0;
  const left = blur + Math.max(0, -dx);
  const right = blur + Math.max(0, dx);
  const top = blur + Math.max(0, -dy);
  const bottom = blur + Math.max(0, dy);
  return {
    x: region.x - left,
    y: region.y - top,
    width: region.width + left + right,
    height: region.height + top + bottom,
  };
};

/** SVG feDropShadow 使用 Gaussian stdDeviation，内部保持单点映射便于后续校准 */
const svgShadowStdDeviation = (s: IRDropShadow): number => (s.blur ?? 0) / 2;

/**
 * 一个 IRDropShadow → `<filter><feDropShadow></filter>` SvgNode
 * @description SVG 端把 user-unit blur 映射为 `feDropShadow.stdDeviation`，Canvas 端按当前 transform 校准；
 *   `flood-color` 缺省半透明黑；`opacity`（若给）→ `flood-opacity`（相乘到有效 alpha）。
 *   `id` 已由 caller 加实例前缀。
 *
 *   filter region 显式取 `userSpaceOnUse` + 扩展后的 scene viewBox：缺省的 objectBoundingBox `-10%/120%` 会按
 *   被引用元素的包围盒裁剪——直线 / 细 path 的包围盒退化为零宽或零高（120%×0≈0）会把投影整段裁没，
 *   小图元上 offset+blur 超过 10% 也会被切边（Tailwind 预设几乎都会）。一个 filter 跨不同尺寸元素共享去重，
 *   故区域不能依赖单个 bbox；统一覆盖并外扩 viewBox 即与 Canvas 口径更接近，且对直线 / 大模糊一致生效。
 */
export const buildShadowDef = (s: IRDropShadow, id: string, region: BoundsRect): SvgNode => {
  const expanded = shadowRegion(s, region);
  return {
    tag: 'filter',
    attrs: {
      id,
      filterUnits: 'userSpaceOnUse',
      x: expanded.x,
      y: expanded.y,
      width: expanded.width,
      height: expanded.height,
    },
    children: [
      {
        tag: 'feDropShadow',
        attrs: compact({
          dx: s.offsetX,
          dy: s.offsetY,
          stdDeviation: svgShadowStdDeviation(s),
          'flood-color': s.color ?? DEFAULT_SHADOW_COLOR,
          'flood-opacity': s.opacity,
        }),
      },
    ],
  };
};
