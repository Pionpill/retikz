import type { ComposedScopeTransform, LayoutAlignmentGuide, Transform } from '@retikz/core';
import { LayoutAlignmentGuideDimension, applyScopeTransform, createCompositeContractError } from '@retikz/core';

/** 筛选子树中没有重名歧义的对齐参考线，供父布局使用 */
export const resolveStructuralAlignmentGuides = (
  guides: ReadonlyArray<LayoutAlignmentGuide>,
): ReadonlyArray<LayoutAlignmentGuide> | undefined => {
  if (guides.length === 0) return undefined;

  const formatGuideKey = (guide: LayoutAlignmentGuide): string => `${guide.dimension}\u0000${guide.name}`;
  const counts = new Map<string, number>();

  for (const guide of guides) {
    const key = formatGuideKey(guide);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const unambiguous = guides.filter(guide => counts.get(formatGuideKey(guide)) === 1);
  return unambiguous.length === 0 ? undefined : unambiguous;
};

/** 用合成矩阵更新对齐参考线，排除无法继续用于对齐的项 */
export const transformAlignmentGuides = (
  guides: ReadonlyArray<LayoutAlignmentGuide> | undefined,
  transforms: ReadonlyArray<Transform>,
  resolveTransform: (transforms: ReadonlyArray<Transform>) => ComposedScopeTransform,
): ReadonlyArray<LayoutAlignmentGuide> | undefined => {
  if (guides === undefined || guides.length === 0) return undefined;
  if (transforms.length === 0) return guides;

  let hasIdentityRotation = false;
  let isXCollapsed = false;
  let isYCollapsed = false;
  for (const transform of transforms) {
    if (transform.kind === 'rotate') {
      if (transform.degrees % 360 !== 0) return undefined;
      hasIdentityRotation = true;
    } else if (transform.kind === 'scale') {
      isXCollapsed ||= transform.x === 0;
      isYCollapsed ||= (transform.y ?? transform.x) === 0;
    }
  }
  if (isXCollapsed && isYCollapsed) return undefined;

  // 整圈旋转按精确恒等处理，避免旋转矩阵中的三角函数误差
  const effectiveTransforms = hasIdentityRotation
    ? transforms.filter(transform => transform.kind !== 'rotate')
    : transforms;
  const composed = resolveTransform(effectiveTransforms);
  const [a, , , d, e, f] = composed.forward;
  const transformed: Array<LayoutAlignmentGuide> = [];

  for (const guide of guides) {
    const isX = guide.dimension === LayoutAlignmentGuideDimension.X;
    if (isX ? isXCollapsed : isYCollapsed) continue;

    const position = composed.canApplyForwardMatrix
      ? isX
        ? a * guide.position + e
        : d * guide.position + f
      : applyScopeTransform(isX ? [guide.position, 0] : [0, guide.position], composed)[isX ? 0 : 1];
    if (!Number.isFinite(position)) {
      throw createCompositeContractError(
        `Transformed alignment guide position must remain finite for '${guide.dimension}:${guide.name}'`,
      );
    }

    transformed.push({ name: guide.name, dimension: guide.dimension, position });
  }

  return transformed.length === 0 ? undefined : transformed;
};
