import type { IRPath } from '@retikz/core';
import { pointAtEllipseArcAngle } from '@retikz/math';

import { ShapeVertexAngleSchema, ShapeInnerRatioSchema, shapeVertexPath } from '../shared';
import type { IRStar } from './types';
/** 将 Star 意图下沉为单一 Core Path */
export const lowerStar = (source: IRStar): IRPath => {
  const innerRadius =
    'innerRadius' in source ? source.innerRadius : source.outerRadius * ShapeInnerRatioSchema.parse(source.innerRatio);
  const rotate = ShapeVertexAngleSchema.parse(source.rotate);
  const vertices = Array.from({ length: source.points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? source.outerRadius : innerRadius;
    return pointAtEllipseArcAngle({
      center: source.center,
      radiusX: radius,
      radiusY: radius,
      angleDeg: rotate + (index * 180) / source.points,
    });
  });
  return shapeVertexPath(source, vertices);
};
