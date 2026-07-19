import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { arrowAppearanceControls } from './arrow-appearance.controls';

export const previewControls = arrowAppearanceControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** Arrow 方向、形状、起末覆盖与外观 playground */
const Demo: FC = () => {
  const values = usePreviewControls(arrowAppearanceControls);

  return (
    <Layout width={440} height={200} viewBox={{ x: -40, y: -100, width: 440, height: 200 }}>
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
};

export default Demo;
