import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { SectorShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, sectorOpenExampleControls } from './sector-open-example.controls';

export const previewControls = sectorOpenExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={320}
    height={210}
    viewBox={{ x: -100, y: -80, width: 200, height: 160 }}
    shapes={[SectorShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      shape={{
        type: 'sector',
        params: {
          innerRadius: values.radius,
          outerRadius: values.radius,
          startAngle: values.startAngle,
          endAngle: values.endAngle,
        },
      }}
      fill="none"
      stroke="darkorange"
      strokeWidth={2.5}
    />
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 调整开放弧 Sector 的半径和扫掠范围 */
const Demo: FC = controlledPreview.Component;

export default Demo;
