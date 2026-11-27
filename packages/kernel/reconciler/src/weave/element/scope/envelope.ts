import type { CompiledReferenceGeometry } from '@retikz/core';
import { calculateScopeEnvelopeBounds, mergeScopeEnvelopeBounds } from '@retikz/core';
import type { AxisAlignedBounds } from '@retikz/math';

/**
 * ⚡旧贡献严格位于包络内部时，只合并其新极值；可能失去边界支撑时完整重算
 * 数组位置仅用于同批几何序列比较，不作为跨次元素身份；长度变化走完整计算
 * 保留极值原始值，不从中心宽高反推；触边含平局，避免改变正负零的声明顺序选择
 */
export const updateWeaveScopeEnvelope = (
  layouts: ReadonlyArray<CompiledReferenceGeometry>,
  previousLayouts: ReadonlyArray<CompiledReferenceGeometry>,
  previousBounds: Readonly<AxisAlignedBounds>,
): Readonly<AxisAlignedBounds> | undefined => {
  if (layouts.length !== previousLayouts.length) return calculateScopeEnvelopeBounds(layouts);
  let bounds = previousBounds;
  for (let index = 0; index < layouts.length; index++) {
    const layout = layouts[index];
    const previous = previousLayouts[index];
    if (layout === previous) continue;
    const oldBounds = calculateScopeEnvelopeBounds([previous])!;
    if (
      oldBounds.minX <= previousBounds.minX ||
      oldBounds.minY <= previousBounds.minY ||
      oldBounds.maxX >= previousBounds.maxX ||
      oldBounds.maxY >= previousBounds.maxY
    )
      return calculateScopeEnvelopeBounds(layouts);
    const nextBounds = calculateScopeEnvelopeBounds([layout])!;
    // 触及旧边界时重算，保留边界平局的声明顺序与符号零
    if (
      nextBounds.minX === previousBounds.minX ||
      nextBounds.minY === previousBounds.minY ||
      nextBounds.maxX === previousBounds.maxX ||
      nextBounds.maxY === previousBounds.maxY
    )
      return calculateScopeEnvelopeBounds(layouts);
    bounds = mergeScopeEnvelopeBounds(bounds, nextBounds)!;
  }
  return bounds;
};
