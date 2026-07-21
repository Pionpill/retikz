import type { FC } from 'react';

import { point, vector2 } from '@retikz/math';
import { Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract,vectorNormalControls } from './vector-normal.controls';

export const previewControls = vectorNormalControls;

const Origin: [number, number] = [0, 0];

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const unit = vector2.fromAngleDegrees(values.angle);
  const vector = point.scale(unit, values.length);
  const normal = vector2.normal(vector);
  const vectorEnd = point.add(Origin, vector);
  const normalEnd = point.add(Origin, normal);
  const vectorLabel = point.add(point.scale(vector, 0.62), point.scale(vector2.normalize(normal), -16));
  const normalLabel = point.add(point.scale(normal, 0.62), point.scale(vector2.normalize(vector), 26));

  return (
    <Layout width={400} height={280} viewBox={{ x: -170, y: -145, width: 340, height: 290 }}>
      <Draw
        way={[
          [-160, 0],
          [160, 0],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [0, -135],
          [0, 135],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />

      <Draw way={[Origin, vectorEnd]} arrow="->" stroke="darkorange" strokeWidth={2} />
      <Draw way={[Origin, normalEnd]} arrow="->" stroke="dodgerblue" strokeWidth={2} />

      <Node position={Origin} shape="circle" minimumSize={7} padding={0} fill="currentColor" stroke="none" />
      <Node position={vectorLabel} stroke="none" textColor="darkorange">
        v
      </Node>
      <Node position={normalLabel} stroke="none" textColor="dodgerblue">
        normal(v)
      </Node>
      <Node position={[0, 125]} stroke="none" textColor="gray" font={{ size: 12 }}>
        dot(v, normal(v)) = 0
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 通过方向角与长度观察向量及其左手法向量 */
const Demo: FC = controlledPreview.Component;

export default Demo;
