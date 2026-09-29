import type { AxisAlignedBounds, Position } from '@retikz/math';
import { boundsOf, boundsToRect, collectArcBoundingCandidates } from '@retikz/math';
import { Draw, Layout, Node } from '@retikz/react';
import { Arc, Circle, Rectangle } from '@retikz/standard-react/shape';
import { Fragment } from 'react';

type LabeledPoint = { label: 'A' | 'B' | 'C'; value: Position };

const ARC_CENTER: Position = [55, -25];

const ARC_RADIUS = 30;

const pointsOf = (values: BoundsPlaygroundPreviewValues): Array<LabeledPoint> => [
  { label: 'A', value: [values.aX, values.aY] },
  { label: 'B', value: [values.bX, values.bY] },
  { label: 'C', value: [values.cX, values.cY] },
];

const labelPositionOf = ([x, y]: Position): Position => [x, y - 12];

const formatCoordinate = (value: number): string => Number(value.toFixed(1)).toString();

const boundsLabelOf = (bounds: AxisAlignedBounds): string =>
  `x: [${formatCoordinate(bounds.minX)}, ${formatCoordinate(bounds.maxX)}]  y: [${formatCoordinate(bounds.minY)}, ${formatCoordinate(bounds.maxY)}]`;

/** 图形参数 */
export type BoundsPlaygroundPreviewValues = {
  arcStartAngle: number;
  arcEndAngle: number;
  aX: number;
  aY: number;
  bX: number;
  bY: number;
  cX: number;
  cY: number;
};

/** 绘制示例图形 */
export const BoundsPlaygroundPreview = (values: BoundsPlaygroundPreviewValues) => {
  const points = pointsOf(values);
  const arcBoundaryPoints = collectArcBoundingCandidates({
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
    <Layout>
      <Draw
        way={[
          [-115, 0],
          [115, 0],
        ]}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw
        way={[
          [0, -95],
          [0, 95],
        ]}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Arc
        center={ARC_CENTER}
        radius={ARC_RADIUS}
        startAngle={values.arcStartAngle}
        endAngle={values.arcEndAngle}
        style={{ stroke: 'dodgerblue', strokeWidth: 2 }}
      />
      <Rectangle
        center={center}
        width={rect.width}
        height={rect.height}
        style={{ stroke: 'gray', strokeOpacity: 0.8, dashPattern: [4, 4], fill: 'none' }}
      />
      {points.map(point => (
        <Fragment key={point.label}>
          <Circle center={point.value} radius={4} style={{ fill: 'darkorange', stroke: 'none' }} />
          <Node position={labelPositionOf(point.value)} style={{ stroke: 'none', textColor: 'darkorange' }}>
            {point.label}
          </Node>
        </Fragment>
      ))}
      <Node
        position={[center[0], Math.min(bounds.maxY + 20, 98)]}
        style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      >
        {boundsLabelOf(bounds)}
      </Node>
    </Layout>
  );
};
