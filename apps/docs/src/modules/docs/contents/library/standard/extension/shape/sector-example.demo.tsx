import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { SectorShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, sectorExampleControls } from './sector-example.controls';

export const previewControls = sectorExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={320}
    height={220}
    viewBox={{ x: -105, y: -85, width: 210, height: 170 }}
    shapes={[SectorShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      shape={{ type: 'sector', params: values }}
      fill="#ffedd5"
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 调整 Sector 的半径、角度和圆角 */
const Demo: FC = controlledPreview.Component;

export default Demo;
