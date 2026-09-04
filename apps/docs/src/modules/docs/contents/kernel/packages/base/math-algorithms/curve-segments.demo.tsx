import type { CurveSegment, CurveSegmentSample, Position } from '@retikz/math';
import type { FC, ReactNode } from 'react';

import { curve } from '@retikz/math';
import { Circle, Draw, Layout, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { curveSegmentsControls, previewControlContract } from './curve-segments.controls';

export const previewControls = curveSegmentsControls;

type CurveSegmentsValues = PreviewControlValuesFor<typeof curveSegmentsControls>;

const CurveSegments = {
  line: {
    kind: 'line',
    from: [-150, -65],
    to: [150, 65],
  },
  quadraticBezier: {
    kind: 'quadraticBezier',
    from: [-150, 70],
    control: [0, -105],
    to: [150, 45],
  },
  cubicBezier: {
    kind: 'cubicBezier',
    from: [-150, 70],
    control1: [-105, -90],
    control2: [75, 120],
    to: [150, -45],
  },
  arc: {
    kind: 'arc',
    center: [0, 0],
    radius: 105,
    startAngleDeg: 205,
    endAngleDeg: 335,
  },
  ellipseArc: {
    kind: 'ellipseArc',
    center: [0, 0],
    radiusX: 130,
    radiusY: 65,
    startAngleDeg: 200,
    endAngleDeg: 340,
  },
} satisfies Record<CurveSegmentsValues['kind'], CurveSegment>;

const controlPolygonOf = (segment: CurveSegment): Array<Position> | undefined => {
  if (segment.kind === 'quadraticBezier') return [segment.from, segment.control, segment.to];
  if (segment.kind === 'cubicBezier') return [segment.from, segment.control1, segment.control2, segment.to];
  return undefined;
};

const stepsOf = (segment: CurveSegment): ReactNode => {
  if (segment.kind === 'line') {
    return (
      <>
        <Step kind="move" to={segment.from} />
        <Step kind="line" to={segment.to} />
      </>
    );
  }
  if (segment.kind === 'quadraticBezier') {
    return (
      <>
        <Step kind="move" to={segment.from} />
        <Step kind="curve" control={segment.control} to={segment.to} />
      </>
    );
  }
  if (segment.kind === 'cubicBezier') {
    return (
      <>
        <Step kind="move" to={segment.from} />
        <Step kind="cubic" control1={segment.control1} control2={segment.control2} to={segment.to} />
      </>
    );
  }

  const start = curve.sampleAt(segment, 0).point;
  const radius = segment.kind === 'arc' ? segment.radius : { x: segment.radiusX, y: segment.radiusY };

  return (
    <>
      <Step kind="move" to={start} />
      <Step
        kind="arc"
        center={segment.center}
        radius={radius}
        startAngle={segment.startAngleDeg}
        endAngle={segment.endAngleDeg}
      />
    </>
  );
};

const tangentEndsOf = (sample: CurveSegmentSample): Array<Position> => {
  const halfLength = 16;
  const [x, y] = sample.point;
  const [tangentX, tangentY] = sample.tangent;

  return [
    [x - tangentX * halfLength, y - tangentY * halfLength],
    [x + tangentX * halfLength, y + tangentY * halfLength],
  ];
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const sourceSegment = CurveSegments[values.kind];
  const sliceSegment = curve.slice(sourceSegment, values.sliceStart, values.sliceEnd);
  const sample = curve.sampleAt(sourceSegment, values.sampleParameter);
  const controlPolygon = controlPolygonOf(sourceSegment);

  return (
    <Layout width={400} height={240} viewBox={{ x: -175, y: -125, width: 350, height: 250 }}>
      {controlPolygon && <Draw way={controlPolygon} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" />}
      <Path stroke="lightgray" strokeWidth={2} fill="none">
        {stepsOf(sourceSegment)}
      </Path>
      <Path stroke="#facc15" strokeWidth={2} fill="none">
        {stepsOf(sliceSegment)}
      </Path>
      {controlPolygon?.map((point, index) => (
        <Circle key={index} center={point} radius={3} fill="lightgray" stroke="none" />
      ))}
      <Draw way={tangentEndsOf(sample)} stroke="#3b82f6" strokeWidth={2} />
      <Circle center={sample.point} radius={5} fill="#3b82f6" stroke="none" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 切换曲线段类型，观察参数采样与保形切片 */
const Demo: FC = controlledPreview.Component;

export default Demo;
