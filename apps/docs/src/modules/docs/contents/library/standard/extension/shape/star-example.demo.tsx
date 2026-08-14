import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { StarShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, starExampleControls } from './star-example.controls';

export const previewControls = starExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={320}
    height={220}
    viewBox={{ x: -105, y: -85, width: 210, height: 170 }}
    shapes={[StarShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      shape={{ type: 'star', params: values }}
      fill="#ffedd5"
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 调整 Star 的角数、半径、旋转与圆角 */
const Demo: FC = controlledPreview.Component;

export default Demo;
