import type { Position } from '@retikz/math';
import type { FC, ReactNode } from 'react';

import { intersect, vector2 } from '@retikz/math';
import { Circle, Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { intersectionPlaygroundControls, previewControlContract } from './intersection-playground.controls';
import { circleCircleCenters, intersectionViewBox } from './intersection-playground.data';

export const previewControls = intersectionPlaygroundControls;

type IntersectionValues = PreviewControlValuesFor<typeof intersectionPlaygroundControls>;

/** 生成用于画布显示的有限线段；lineLine 仍会把端点所在方向视为无限直线 */
const lineEnds = (center: Position, angle: number, length: number): [Position, Position] => {
  const direction = vector2.scale(vector2.fromAngleDegrees(angle), length);
  return [vector2.sub(center, direction), vector2.add(center, direction)];
};

const sceneOf = (values: IntersectionValues): { geometry: ReactNode; hits: Array<Position> } => {
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
          <Draw way={a} stroke="darkorange" strokeWidth={2} />
          <Draw way={b} stroke="dodgerblue" strokeWidth={2} />
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
          <Draw way={[origin, lineEnd]} stroke="darkorange" strokeWidth={2} />
          <Circle center={[0, 0]} radius={values.radius} stroke="dodgerblue" strokeWidth={2} fill="none" />
        </>
      ),
      hits: intersect.lineCircle({ origin, dir: [1, 0], center: [0, 0], radius: values.radius }),
    };
  }

  const [centerA, centerB] = circleCircleCenters(values.offset);
  return {
    geometry: (
      <>
        <Circle center={centerA} radius={values.radius} stroke="darkorange" strokeWidth={2} fill="none" />
        <Circle center={centerB} radius={values.radius} stroke="dodgerblue" strokeWidth={2} fill="none" />
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const scene = sceneOf(values);

  return (
    <Layout width={400} height={260} viewBox={intersectionViewBox}>
      {scene.geometry}
      {scene.hits.map((hit, index) => (
        <Circle key={`${hit[0]}-${hit[1]}-${index}`} center={hit} radius={5} fill="darkviolet" stroke="none" />
      ))}
      <Node position={[0, 88]} stroke="none" textColor="gray" font={{ size: 12 }}>
        |I| = {scene.hits.length}
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 在固定取景中比较不同几何对象的求交及退化结果 */
const Demo: FC = controlledPreview.Component;

export default Demo;
