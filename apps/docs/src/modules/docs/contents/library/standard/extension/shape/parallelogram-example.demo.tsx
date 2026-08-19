import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { ParallelogramShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { parallelogramExampleControls, previewControlContract } from './parallelogram-example.controls';

export const previewControls = parallelogramExampleControls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={380}
    height={220}
    viewBox={{ x: -120, y: -80, width: 240, height: 160 }}
    shapes={[ParallelogramShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      minimumSize={{ width: 130, height: 72 }}
      shape={{
        type: 'parallelogram',
        params: {
          slantDirection: values.slantDirection,
          slantAngle: values.slantAngle,
          cornerRadius: values.cornerRadius,
        },
      }}
      fill="#ffedd5"
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
/** 固定 Parallelogram 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
