import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { CylinderShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { cylinderExampleControls, previewControlContract } from './cylinder-example.controls';

export const previewControls = cylinderExampleControls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={380}
    height={220}
    viewBox={{ x: -120, y: -90, width: 240, height: 180 }}
    shapes={[CylinderShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      minimumSize={{ width: 130, height: 90 }}
      shape={{ type: 'cylinder', params: { axis: values.axis, capDepth: values.capDepth } }}
      fill="#ffedd5"
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
/** 固定 Cylinder 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
