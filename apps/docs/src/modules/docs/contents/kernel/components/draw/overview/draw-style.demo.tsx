import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawStyleControls, previewControlContract } from './draw-style.controls';

export const previewControls = drawStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={218} viewBox={{ x: -40, y: -120, width: 440, height: 240 }}>
      <Node id="A" position={[0, -50]} stroke="gray" dashed>
        a
      </Node>
      <Node id="B" position={[360, 50]} stroke="gray" dashed>
        b
      </Node>
      <Draw
        way={['A', [120, -50], [120, 50], [240, 50], [240, -50], 'B']}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
        dashPattern={values.dashed ? [8, 4] : undefined}
        dashOffset={values.dashOffset}
        roundedCorners={values.roundedCorners}
        arrow={values.arrow}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Draw 开放路径外观 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
