import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathStrokePaintControls } from './path-stroke-paint.controls';

export const previewControls = pathStrokePaintControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** Path 渐变描边 playground */
const Demo: FC = () => {
  const values = usePreviewControls(pathStrokePaintControls);

  return (
    <Layout width={420} height={180} viewBox={{ x: -210, y: -90, width: 420, height: 180 }}>
      <Path
        stroke={{
          kind: 'linearGradient',
          angle: values.angle,
          stops: [
            { offset: 0, color: values.startColor },
            { offset: 0.5, color: values.middleColor },
            { offset: 1, color: values.endColor },
          ],
        }}
        strokeWidth={10}
        lineCap="round"
        dashPattern={[12, 8]}
      >
        <Step kind="move" to={[-160, 30]} />
        <Step kind="curve" control={[0, -90]} to={[160, -20]} />
      </Path>
    </Layout>
  );
};

export default Demo;
