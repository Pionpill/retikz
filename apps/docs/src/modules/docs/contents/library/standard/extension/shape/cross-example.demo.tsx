import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { CrossShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import { crossExampleControls, previewControlContract } from './cross-example.controls';

export const previewControls = crossExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={320}
    height={210}
    viewBox={{ x: -100, y: -80, width: 200, height: 160 }}
    shapes={[CrossShapeDefinition]}
  >
    <Node
      position={[0, 0]}
      shape={{
        type: 'cross',
        params: {
          width: {
            default: values.horizontalWidth,
            horizontal: values.horizontalWidth,
            vertical: values.verticalWidth,
          },
          height: {
            default: values.topHeight,
            horizontal: values.topHeight,
            vertical: values.topHeight,
            top: values.topHeight,
            right: values.rightHeight,
            bottom: values.bottomHeight,
            left: values.leftHeight,
          },
        },
      }}
      fill={values.fill}
      stroke="darkorange"
      strokeWidth={1.5}
    />
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 调整 Cross 的外接尺寸与填充 */
const Demo: FC = controlledPreview.Component;

export default Demo;
