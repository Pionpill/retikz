import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { drawStyleControls } from './draw-style.controls';

export const previewControls = drawStyleControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** Draw 开放路径外观 playground */
const Demo: FC = () => {
  const values = usePreviewControls(drawStyleControls);

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
};

export default Demo;
