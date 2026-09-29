import type { Ellipse, Position } from '@retikz/math';
import { boundsOf, boundsToRect, centerOfBounds, collectArcBoundingCandidates, ellipse } from '@retikz/math';
import { Draw, Layout } from '@retikz/react';
import { Arc, Circle, Ellipse as EllipseShape, Rectangle } from '@retikz/standard-react/shape';

const ELLIPSE_CENTER: Position = [-70, 0];

const ARC_CENTER: Position = [70, 0];

/** 图形参数 */
export type EllipseArcPlaygroundPreviewValues = {
  ellipseRadiusX: number;
  ellipseRadiusY: number;
  arcRadius: number;
  arcStartAngle: number;
  arcEndAngle: number;
};

/** 绘制示例图形 */
export const EllipseArcPlaygroundPreview = (values: EllipseArcPlaygroundPreviewValues) => {
  const ellipseValue: Ellipse = ellipse.inscribedInBox({
    x: ELLIPSE_CENTER[0],
    y: ELLIPSE_CENTER[1],
    width: values.ellipseRadiusX * 2,
    height: values.ellipseRadiusY * 2,
    rotate: 0,
  });
  const ellipseBounds = boundsOf([
    [ellipseValue.x - ellipseValue.rx, ellipseValue.y - ellipseValue.ry],
    [ellipseValue.x + ellipseValue.rx, ellipseValue.y - ellipseValue.ry],
    [ellipseValue.x - ellipseValue.rx, ellipseValue.y + ellipseValue.ry],
    [ellipseValue.x + ellipseValue.rx, ellipseValue.y + ellipseValue.ry],
  ]);
  const arcBounds = boundsOf(
    collectArcBoundingCandidates({
      center: ARC_CENTER,
      radius: values.arcRadius,
      startAngleDeg: values.arcStartAngle,
      endAngleDeg: values.arcEndAngle,
    }),
  );
  if (ellipseBounds === undefined || arcBounds === undefined) return null;

  const ellipseBoundsRect = boundsToRect(ellipseBounds);
  const arcBoundsRect = boundsToRect(arcBounds);

  return (
    <Layout>
      <Draw
        way={[
          [-145, 0],
          [145, 0],
        ]}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <EllipseShape
        center={ellipse.center(ellipseValue)}
        radius={{ x: ellipseValue.rx, y: ellipseValue.ry }}
        style={{ stroke: 'darkorange', strokeWidth: 2, fill: 'none' }}
      />
      <Arc
        center={ARC_CENTER}
        radius={values.arcRadius}
        startAngle={values.arcStartAngle}
        endAngle={values.arcEndAngle}
        style={{ stroke: 'dodgerblue', strokeWidth: 2 }}
      />
      <Rectangle
        center={centerOfBounds(ellipseBounds)}
        width={ellipseBoundsRect.width}
        height={ellipseBoundsRect.height}
        style={{ stroke: 'gray', strokeOpacity: 0.8, dashPattern: [4, 4], fill: 'none' }}
      />
      <Rectangle
        center={centerOfBounds(arcBounds)}
        width={arcBoundsRect.width}
        height={arcBoundsRect.height}
        style={{ stroke: 'gray', strokeOpacity: 0.8, dashPattern: [4, 4], fill: 'none' }}
      />
      <Circle center={ELLIPSE_CENTER} radius={3} style={{ fill: 'darkorange', stroke: 'none' }} />
      <Circle center={ARC_CENTER} radius={3} style={{ fill: 'dodgerblue', stroke: 'none' }} />
    </Layout>
  );
};
