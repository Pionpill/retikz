import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { TrapezoidShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, trapezoidExampleControls } from './trapezoid-example.controls';

export const previewControls = trapezoidExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={380}
    height={220}
    viewBox={{ x: -120, y: -80, width: 240, height: 160 }}
    shapes={[TrapezoidShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      minimumSize={{ width: 130, height: 72 }}
      shape={{
        type: 'trapezoid',
        params: {
          shortSide: values.shortSide,
          shortSideRatio: values.shortSideRatio,
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

/** 固定 Trapezoid 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;

export default Demo;
