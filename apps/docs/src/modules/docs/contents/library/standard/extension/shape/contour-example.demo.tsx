import type { Position } from '@retikz/math';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { ContourShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { contourExampleControls, previewControlContract } from './contour-example.controls';

export const previewControls = contourExampleControls;

const presetPoints: Record<string, Array<Position>> = {
  tag: [
    [-76, -36],
    [18, -36],
    [72, 0],
    [18, 36],
    [-76, 36],
  ],
  shield: [
    [-64, -44],
    [64, -44],
    [48, 30],
    [0, 60],
    [-48, 30],
  ],
  notch: [
    [-76, -42],
    [76, -42],
    [76, 42],
    [-18, 42],
    [0, 0],
    [-18, -42],
  ],
};

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={320}
    height={220}
    viewBox={{ x: -110, y: -90, width: 220, height: 180 }}
    shapes={[ContourShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      shape={{ type: 'contour', params: { points: presetPoints[values.preset], cornerRadius: values.cornerRadius } }}
      fill="#ffedd5"
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 用预设顶点环调整 Contour 轮廓 */
const Demo: FC = controlledPreview.Component;

export default Demo;
