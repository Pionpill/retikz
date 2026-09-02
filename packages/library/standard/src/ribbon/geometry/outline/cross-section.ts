import type { IRPosition } from '@retikz/core';
import type { CurveSegmentSample, Vector2 } from '@retikz/math';

import { isFinitePoint, vector2 } from '@retikz/math';

import type { RibbonAlignmentValue } from '../../types';
import type { RibbonCrossSection } from '../types';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../../errors';
import { alignTangentNormal, blendTangent } from '../centerline';

const ENDPOINT_DIRECTION_BLEND_SPAN = 0.18;

export type RibbonCrossSectionInput = {
  sample: CurveSegmentSample;
  offset: number;
  widthAt: (offset: number) => number;
  endpointTangents: { start: Vector2; end: Vector2 };
  align: RibbonAlignmentValue;
  round: (n: number) => number;
};

/**
 * 计算中心线某一点的 ribbon 横截面
 * @description 宽度按 offset 求值；align 决定宽度分配到左右两侧的比例；首尾附近会把切线向端点 direction 平滑过渡
 */
export const ribbonCrossSection = ({
  sample,
  offset,
  widthAt,
  endpointTangents,
  align,
  round,
}: RibbonCrossSectionInput): RibbonCrossSection => {
  const width = widthAt(offset);
  const startTangent = alignTangentNormal(endpointTangents.start, sample.tangent);
  const endTangent = alignTangentNormal(endpointTangents.end, sample.tangent);
  const tangent =
    offset <= ENDPOINT_DIRECTION_BLEND_SPAN
      ? blendTangent({
          endpointTangent: startTangent,
          sampleTangent: sample.tangent,
          t: offset / ENDPOINT_DIRECTION_BLEND_SPAN,
          source: 'start blended',
        })
      : offset >= 1 - ENDPOINT_DIRECTION_BLEND_SPAN
        ? blendTangent({
            endpointTangent: endTangent,
            sampleTangent: sample.tangent,
            t: (1 - offset) / ENDPOINT_DIRECTION_BLEND_SPAN,
            source: 'end blended',
          })
        : sample.tangent;
  const normal = vector2.normal(tangent);
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
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.GeometryInvalid,
      message: 'Ribbon sampling produced a non-finite coordinate; check width profile output.',
      details: { left, right, sample: sample.point, width },
    });
  }
  return {
    center: [round(sample.point[0]), round(sample.point[1])],
    left,
    right,
    tangent,
    width,
  };
};
