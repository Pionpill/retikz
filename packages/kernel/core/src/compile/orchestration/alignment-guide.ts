import type { LayoutAlignmentGuide, Transform } from '../../contract';
import { LayoutAlignmentGuideDimension } from '../../contract';
import { createCompositeContractError } from '../../resolve/diagnostics';

const canonicalNumber = (value: number): number => (Object.is(value, -0) ? 0 : value);

const guideKey = (guide: LayoutAlignmentGuide): string => `${guide.dimension}\u0000${guide.name}`;

/** 校验并分离一组 result-facing alignment guides */
export const cloneAlignmentGuides = (
  guides: ReadonlyArray<LayoutAlignmentGuide>,
  ownerLabel: string,
): ReadonlyArray<LayoutAlignmentGuide> => {
  const keys = new Set<string>();
  const cloned: Array<LayoutAlignmentGuide> = [];
  const guideCount = guides.length;

  for (let index = 0; index < guideCount; index += 1) {
    const { name, dimension, position } = guides[index];
    if (!Number.isFinite(position)) {
      throw createCompositeContractError(
        `${ownerLabel} returned invalid alignment guide position at index ${index}; expected finite number`,
      );
    }

    const clonedGuide = Object.freeze({
      name,
      dimension,
      position: canonicalNumber(position),
    });
    const key = guideKey(clonedGuide);
    if (keys.has(key)) {
      throw createCompositeContractError(
        `${ownerLabel} returned duplicate alignment guide '${clonedGuide.dimension}:${clonedGuide.name}'`,
      );
    }

    keys.add(key);
    cloned.push(clonedGuide);
  }

  return Object.freeze(cloned);
};

/** 只保留 Structural Scope 中键唯一的 descendant guides */
export const resolveStructuralAlignmentGuides = (
  guides: ReadonlyArray<LayoutAlignmentGuide>,
): ReadonlyArray<LayoutAlignmentGuide> | undefined => {
  if (guides.length === 0) return undefined;

  const counts = new Map<string, number>();

  for (const guide of guides) {
    const key = guideKey(guide);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const unambiguous = guides.filter(guide => counts.get(guideKey(guide)) === 1);

  return unambiguous.length === 0 ? undefined : cloneAlignmentGuides(unambiguous, 'Structural Scope');
};

const isEffectiveIdentityRotation = (degrees: number): boolean => canonicalNumber(degrees % 360) === 0;

/** 沿保持 guide 单轴标量语义的 transform chain 投影 alignment guides */
export const transformAlignmentGuides = (
  guides: ReadonlyArray<LayoutAlignmentGuide> | undefined,
  transforms: ReadonlyArray<Transform>,
): ReadonlyArray<LayoutAlignmentGuide> | undefined => {
  if (guides === undefined || guides.length === 0) return undefined;

  const transformed: Array<LayoutAlignmentGuide> = [];

  for (const guide of guides) {
    let position: number | undefined = guide.position;

    for (let index = transforms.length - 1; index >= 0; index -= 1) {
      const transform = transforms[index];
      if (position === undefined) break;
      if (transform.kind === 'rotate') {
        if (!isEffectiveIdentityRotation(transform.degrees)) position = undefined;
        continue;
      }

      if (transform.kind === 'translate') {
        position += guide.dimension === LayoutAlignmentGuideDimension.X ? transform.x : transform.y;
        continue;
      }

      const scale = guide.dimension === LayoutAlignmentGuideDimension.X ? transform.x : (transform.y ?? transform.x);
      position = scale === 0 ? undefined : position * scale;
    }

    if (position !== undefined) {
      transformed.push({ name: guide.name, dimension: guide.dimension, position });
    }
  }

  return transformed.length === 0 ? undefined : cloneAlignmentGuides(transformed, 'Transformed alignment guide result');
};
