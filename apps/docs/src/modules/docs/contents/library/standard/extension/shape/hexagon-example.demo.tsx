import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { HexagonShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { hexagonExampleControls, previewControlContract } from './hexagon-example.controls';

export const previewControls = hexagonExampleControls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={380}
    height={220}
    viewBox={{ x: -120, y: -80, width: 240, height: 160 }}
    shapes={[HexagonShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      minimumSize={{ width: 140, height: 72 }}
      shape={{ type: 'hexagon', params: { shoulderDepth: values.shoulderDepth, cornerRadius: values.cornerRadius } }}
      fill="#ffedd5"
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
/** 固定 Hexagon 并调整其固定肩深与圆角参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
