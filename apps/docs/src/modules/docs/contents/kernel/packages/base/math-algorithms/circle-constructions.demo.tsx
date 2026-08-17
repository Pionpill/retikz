import type { Position } from '@retikz/math';
import type { FC } from 'react';

import { circle, triangle } from '@retikz/math';
import { Circle, Draw, Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { circleConstructionsControls, previewControlContract } from './circle-constructions.controls';

export const previewControls = circleConstructionsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const vertices: [Position, Position, Position] = [values.triangleA, values.triangleB, values.triangleC];
  const points: Array<Position> = [values.pointA, values.pointB, values.pointC, values.pointD, values.pointE];
  const triangleCircle =
    values.scheme === 'circumcircle'
      ? triangle.circumCircle(...vertices)
      : values.scheme === 'incircle'
        ? triangle.inCircle(...vertices)
        : undefined;
  const enclosingCircle = values.scheme === 'minimalEnclosing' ? circle.minimalEnclosing(points) : undefined;
  const isTriangleScheme = values.scheme === 'circumcircle' || values.scheme === 'incircle';

  return (
    <Layout width={400} height={260} viewBox={{ x: -165, y: -115, width: 330, height: 230 }}>
      {isTriangleScheme ? <Draw way={[...vertices, vertices[0]]} stroke="darkorange" strokeWidth={2} /> : null}
      {isTriangleScheme
        ? vertices.map((point, index) => (
            <Circle key={`triangle-${index}`} center={point} radius={4} fill="darkorange" stroke="none" />
          ))
        : points.map((point, index) => (
            <Circle key={`point-${index}`} center={point} radius={4} fill="darkorange" stroke="none" />
          ))}
      {triangleCircle && (
        <Circle
          center={triangleCircle.center}
          radius={triangleCircle.radius}
          stroke="dodgerblue"
          strokeWidth={2}
          fill="none"
        />
      )}
      {enclosingCircle && (
        <Circle
          center={enclosingCircle.center}
          radius={enclosingCircle.radius}
          stroke="dodgerblue"
          strokeWidth={2}
          fill="none"
        />
      )}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 受控比较三种圆构造方案 */
const Demo: FC = controlledPreview.Component;

export default Demo;
