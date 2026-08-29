import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { EllipticCapsuleShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { ellipticCapsuleExampleControls, previewControlContract } from './elliptic-capsule-example.controls';

export const previewControls = ellipticCapsuleExampleControls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={380}
    height={220}
    viewBox={{ x: -120, y: -90, width: 240, height: 180 }}
    shapes={[EllipticCapsuleShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      minimumSize={{ width: 130, height: 90 }}
      shape={{ type: 'ellipticCapsule', params: { axis: values.axis, capDepth: values.capDepth } }}
      fill="#ffedd5"
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
/** 固定 Elliptic Capsule 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
