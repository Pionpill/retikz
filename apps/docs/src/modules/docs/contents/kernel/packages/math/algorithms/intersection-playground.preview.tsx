import type { Position } from '@retikz/math';
import { intersect, vector2 } from '@retikz/math';
import { Draw, Layout, Node } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';
import type { ReactNode } from 'react';

import { circleCircleCenters } from './intersection-playground.data';

const lineEnds = (center: Position, angle: number, length: number): [Position, Position] => {
  const direction = vector2.scale(vector2.fromAngleDegrees(angle), length);
  return [vector2.sub(center, direction), vector2.add(center, direction)];
};

const sceneOf = (values: IntersectionPlaygroundPreviewValues): { geometry: ReactNode; hits: Array<Position> } => {
  if (values.kind === 'lineLine' || values.kind === 'segmentSegment') {
    const a: [Position, Position] = [
      [-135, 0],
      [135, 0],
    ];
    const b = lineEnds([0, values.offset], values.angle, 125);
    const hit =
      values.kind === 'lineLine'
        ? intersect.lineLine({ a1: a[0], a2: a[1], b1: b[0], b2: b[1] })
        : intersect.segmentSegment({ a1: a[0], a2: a[1], b1: b[0], b2: b[1] });

    return {
      geometry: (
        <>
          <Draw way={a} style={{ stroke: 'darkorange', strokeWidth: 2 }} />
          <Draw way={b} style={{ stroke: 'dodgerblue', strokeWidth: 2 }} />
        </>
      ),
      hits: hit === null ? [] : [hit],
    };
  }

  if (values.kind === 'lineCircle') {
    const origin: Position = [-170, values.offset];
    const lineEnd: Position = [170, values.offset];

    return {
      geometry: (
        <>
          <Draw way={[origin, lineEnd]} style={{ stroke: 'darkorange', strokeWidth: 2 }} />
          <Circle
            center={[0, 0]}
            radius={values.radius}
            style={{ stroke: 'dodgerblue', strokeWidth: 2, fill: 'none' }}
          />
        </>
      ),
      hits: intersect.lineCircle({ origin, direction: [1, 0], center: [0, 0], radius: values.radius }),
    };
  }

  const [centerA, centerB] = circleCircleCenters(values.offset);

  return {
    geometry: (
      <>
        <Circle
          center={centerA}
          radius={values.radius}
          style={{ stroke: 'darkorange', strokeWidth: 2, fill: 'none' }}
        />
        <Circle
          center={centerB}
          radius={values.radius}
          style={{ stroke: 'dodgerblue', strokeWidth: 2, fill: 'none' }}
        />
      </>
    ),
    hits: intersect.circleCircle({
      centerA,
      radiusA: values.radius,
      centerB,
      radiusB: values.radius,
    }),
  };
};

/** 图形参数 */
export type IntersectionPlaygroundPreviewValues = {
  kind: 'lineCircle' | 'lineLine' | 'segmentSegment' | 'circleCircle';
  offset: number;
  angle: number;
  radius: number;
};

/** 绘制示例图形 */
export const IntersectionPlaygroundPreview = (values: IntersectionPlaygroundPreviewValues) => {
  const scene = sceneOf(values);

  return (
    <Layout>
      {scene.geometry}
      {scene.hits.map((hit, index) => (
        <Circle
          key={`${hit[0]}-${hit[1]}-${index}`}
          center={hit}
          radius={5}
          style={{ fill: 'darkviolet', stroke: 'none' }}
        />
      ))}
      <Node position={[0, 88]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        |I| = {scene.hits.length}
      </Node>
    </Layout>
  );
};
