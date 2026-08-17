import type { AxisAlignedBounds, Position } from '@retikz/math';
import { Fragment, type FC } from 'react';

import { arcBoundingPoints, boundsOf, boundsToRect } from '@retikz/math';
import { Arc, Circle, Draw, Layout, Node, Rectangle } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { boundsPlaygroundControls, previewControlContract } from './bounds-playground.controls';

export const previewControls = boundsPlaygroundControls;

type BoundsPlaygroundValues = PreviewControlValuesFor<typeof boundsPlaygroundControls>;
type LabeledPoint = { label: 'A' | 'B' | 'C'; value: Position };

const ARC_CENTER: Position = [55, -25];
const ARC_RADIUS = 30;

const pointsOf = (values: BoundsPlaygroundValues): Array<LabeledPoint> => [
  { label: 'A', value: [values.aX, values.aY] },
  { label: 'B', value: [values.bX, values.bY] },
  { label: 'C', value: [values.cX, values.cY] },
];

const labelPositionOf = ([x, y]: Position): Position => [x, y - 12];

const formatCoordinate = (value: number): string => Number(value.toFixed(1)).toString();

const boundsLabelOf = (bounds: AxisAlignedBounds): string =>
  `x: [${formatCoordinate(bounds.minX)}, ${formatCoordinate(bounds.maxX)}]  y: [${formatCoordinate(bounds.minY)}, ${formatCoordinate(bounds.maxY)}]`;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const points = pointsOf(values);
  const arcBoundaryPoints = arcBoundingPoints({
    center: ARC_CENTER,
    radius: ARC_RADIUS,
    startAngleDeg: values.arcStartAngle,
    endAngleDeg: values.arcEndAngle,
  });
  const bounds = boundsOf([...points.map(point => point.value), ...arcBoundaryPoints]);
  if (bounds === undefined) return null;

  const rect = boundsToRect(bounds);
  const center: Position = [rect.x + rect.width / 2, rect.y + rect.height / 2];

  return (
    <Layout width={400} height={280} viewBox={{ x: -125, y: -105, width: 250, height: 220 }}>
      <Draw
        way={[
          [-115, 0],
          [115, 0],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [0, -95],
          [0, 95],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Arc
        center={ARC_CENTER}
        radius={ARC_RADIUS}
        startAngle={values.arcStartAngle}
        endAngle={values.arcEndAngle}
        stroke="dodgerblue"
        strokeWidth={2}
      />
      <Rectangle
        center={center}
        width={rect.width}
        height={rect.height}
        stroke="gray"
        strokeOpacity={0.8}
        dashPattern={[4, 4]}
        fill="none"
      />
      {points.map(point => (
        <Fragment key={point.label}>
          <Circle center={point.value} radius={4} fill="darkorange" stroke="none" />
          <Node position={labelPositionOf(point.value)} stroke="none" textColor="darkorange">
            {point.label}
          </Node>
        </Fragment>
      ))}
      <Node position={[center[0], Math.min(bounds.maxY + 20, 98)]} stroke="none" textColor="gray" font={{ size: 12 }}>
        {boundsLabelOf(bounds)}
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 编辑点集并观察点集与圆弧共同影响轴对齐边界 */
const Demo: FC = controlledPreview.Component;

export default Demo;
