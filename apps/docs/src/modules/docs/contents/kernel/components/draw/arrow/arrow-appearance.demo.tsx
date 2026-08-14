import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { DiamondArrowDefinition, OpenDiamondArrowDefinition } from '@retikz/standard/arrow';

import { defineControlledPreview } from '@/modules/docs/preview';

import { arrowAppearanceControls, previewControlContract } from './arrow-appearance.controls';

export const previewControls = arrowAppearanceControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout
      width={400}
      height={182}
      viewBox={{ x: -40, y: -100, width: 440, height: 200 }}
      arrows={[DiamondArrowDefinition, OpenDiamondArrowDefinition]}
    >
      <Node id="A" position={[0, 0]} stroke="gray" dashed>
        a
      </Node>
      <Node id="B" position={[360, 0]} stroke="gray" dashed>
        b
      </Node>
      <Draw
        way={['A', 'B']}
        arrow={values.direction}
        arrowDetail={{
          shape: values.shape,
          color: values.color,
          scale: values.scale,
          length: values.length,
          width: values.width,
          opacity: values.opacity,
          ...(values.separateEnds
            ? {
                start: { shape: values.startShape, color: values.startColor },
                end: { shape: values.endShape, color: values.endColor },
              }
            : {}),
        }}
        stroke="gray"
        strokeWidth={2}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Arrow 方向、形状、起末覆盖与外观 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
