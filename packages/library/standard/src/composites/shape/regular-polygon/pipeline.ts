import type { IRPath } from '@retikz/core';
import { pointAtEllipseArcAngle } from '@retikz/math';

import { ShapeVertexAngleSchema, shapeVertexPath } from '../shared';
import type { IRRegularPolygon } from './types';
/** 将 RegularPolygon 意图下沉为单一 Core Path */
export const lowerRegularPolygon = (source: IRRegularPolygon): IRPath => {
  const radius = 'radius' in source ? source.radius : source.sideLength / (2 * Math.sin(Math.PI / source.sides));
  const rotate = ShapeVertexAngleSchema.parse(source.rotate);
  const vertices = Array.from({ length: source.sides }, (_, index) =>
    pointAtEllipseArcAngle({
      center: source.center,
      radiusX: radius,
      radiusY: radius,
      angleDeg: rotate + (index * 360) / source.sides,
    }),
  );
  return shapeVertexPath(source, vertices);
};
