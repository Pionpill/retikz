import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawStyleControls, previewControlContract } from './draw-style.controls';

export const previewControls = drawStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout viewBox={{ x: -40, y: -120, width: 440, height: 240 }}>
      <Node id="A" position={[0, -50]} style={{ stroke: 'gray', dashed: true }}>
        a
      </Node>
      <Node id="B" position={[360, 50]} style={{ stroke: 'gray', dashed: true }}>
        b
      </Node>
      <Draw
        way={['A', [120, -50], [120, 50], [240, 50], [240, -50], 'B']}
        roundedCorners={values.roundedCorners}
        arrow={values.arrow}
        style={{
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          ...(values.dashed ? { dashPattern: [8, 4] } : {}),
          dashOffset: values.dashOffset,
        }}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Draw 开放路径外观 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
