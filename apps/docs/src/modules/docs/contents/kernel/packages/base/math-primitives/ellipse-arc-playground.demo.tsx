import type { Ellipse, Position } from '@retikz/math';
import type { FC } from 'react';

import { arcBoundingPoints, boundsCenter, boundsOf, boundsToRect, ellipse } from '@retikz/math';
import { Arc, Circle, Draw, Ellipse as EllipseShape, Layout, Rectangle } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { ellipseArcPlaygroundControls, previewControlContract } from './ellipse-arc-playground.controls';

export const previewControls = ellipseArcPlaygroundControls;

const ELLIPSE_CENTER: Position = [-70, 0];
const ARC_CENTER: Position = [70, 0];

const controlledPreview = defineControlledPreview(previewControlContract, values => {
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
    arcBoundingPoints({
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
    <Layout width={400} height={280} viewBox={{ x: -150, y: -105, width: 300, height: 220 }}>
      <Draw
        way={[
          [-145, 0],
          [145, 0],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <EllipseShape
        center={ellipse.center(ellipseValue)}
        radius={{ x: ellipseValue.rx, y: ellipseValue.ry }}
        stroke="darkorange"
        strokeWidth={2}
        fill="none"
      />
      <Arc
        center={ARC_CENTER}
        radius={values.arcRadius}
        startAngle={values.arcStartAngle}
        endAngle={values.arcEndAngle}
        stroke="dodgerblue"
        strokeWidth={2}
      />
      <Rectangle
        center={boundsCenter(ellipseBounds)}
        width={ellipseBoundsRect.width}
        height={ellipseBoundsRect.height}
        stroke="gray"
        strokeOpacity={0.8}
        dashPattern={[4, 4]}
        fill="none"
      />
      <Rectangle
        center={boundsCenter(arcBounds)}
        width={arcBoundsRect.width}
        height={arcBoundsRect.height}
        stroke="gray"
        strokeOpacity={0.8}
        dashPattern={[4, 4]}
        fill="none"
      />
      <Circle center={ELLIPSE_CENTER} radius={3} fill="darkorange" stroke="none" />
      <Circle center={ARC_CENTER} radius={3} fill="dodgerblue" stroke="none" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 通过面板绘制椭圆与圆弧，并显示各自的轴对齐边界 */
const Demo: FC = controlledPreview.Component;

export default Demo;
