import type { IRPosition } from '@retikz/core';
import type { CurveSegmentSample, Vector2 } from '@retikz/math';
import { isFinitePoint, vector2 } from '@retikz/math';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../../errors';
import type { RibbonAlignment } from '../../constants';
import type { RibbonCrossSection } from '../types';

export type RibbonCrossSectionInput = {
  sample: CurveSegmentSample;
  offset: number;
  widthAt: (offset: number) => number;
  endpointAxes: { start?: Vector2; end?: Vector2 };
  align: RibbonAlignment;
  round: (n: number) => number;
};

/**
 * 计算中心线某一点的 ribbon 横截面
 * @description 宽度按 offset 求值；align 决定宽度分配到左右两侧的比例；显式端点方向仅影响端点横截面
 */
export const ribbonCrossSection = ({
  sample,
  offset,
  widthAt,
  endpointAxes,
  align,
  round,
}: RibbonCrossSectionInput): RibbonCrossSection => {
  const width = widthAt(offset);
  const tangent = sample.tangent;
  const explicit = offset === 0 ? endpointAxes.start : offset === 1 ? endpointAxes.end : undefined;
  const reference = vector2.normal(tangent);
  let normal = reference;
  if (explicit !== undefined) {
    const dot = explicit[0] * reference[0] + explicit[1] * reference[1];
    if (Math.abs(dot) < 1e-8)
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.GeometryInvalid,
        message: 'Ribbon section direction must not be parallel to the centerline tangent.',
        details: { offset, direction: explicit },
      });

    normal = dot < 0 ? [-explicit[0], -explicit[1]] : explicit;
  }

  const leftOffset = align === 'right' ? 0 : align === 'left' ? width : width / 2;
  const rightOffset = align === 'left' ? 0 : align === 'right' ? width : width / 2;
  const left: IRPosition = [
    round(sample.point[0] + normal[0] * leftOffset),
    round(sample.point[1] + normal[1] * leftOffset),
  ];
  const right: IRPosition = [
    round(sample.point[0] - normal[0] * rightOffset),
    round(sample.point[1] - normal[1] * rightOffset),
  ];
  if (!isFinitePoint(left) || !isFinitePoint(right)) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: 'Ribbon sampling produced a non-finite coordinate; check width profile output.',
      details: { left, right, sample: sample.point, width },
    });
  }

  return {
    center: [round(sample.point[0]), round(sample.point[1])],
    left,
    right,
    tangent,
    axis: normal,
    width,
  };
};
