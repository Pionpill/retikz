import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, shadowPlaygroundControls } from './shadow-playground.controls';

export const previewControls = shadowPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout viewBox={{ x: -140, y: -115, width: 280, height: 230 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        style={{
          fill: 'white',
          shadow: {
            offsetX: values.offsetX,
            offsetY: values.offsetY,
            blur: values.blur,
            color: values.color,
            opacity: values.opacity,
          },
        }}
        layout={{ padding: { x: 34, y: 22 } }}
      >
        shadow
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 固定一张卡片，让面板只探索 shadow 对象的连续参数 */
const Demo: FC = controlledPreview.Component;

export default Demo;
