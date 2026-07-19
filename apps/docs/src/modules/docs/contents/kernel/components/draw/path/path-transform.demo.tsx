import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathTransformControls } from './path-transform.controls';

export const previewControls = pathTransformControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/**
 * 路径整体变换 playground
 */
const Demo: FC = () => {
  const values = usePreviewControls(pathTransformControls);

  return (
    <Layout width={320} height={220} viewBox={{ x: -160, y: -110, width: 320, height: 220 }}>
      <Path stroke="#94a3b8" strokeWidth={1.5} dashPattern={[1, 4]} lineCap="round">
        <Step kind="move" to={[-55, -45]} />
        <Step kind="line" to={[-55, 45]} />
        <Step kind="line" to={[55, 45]} />
      </Path>
      <Path
        stroke="dodgerblue"
        strokeWidth={3}
        rotate={values.rotate}
        scale={{ x: values.scale[0], y: values.scale[1] }}
      >
        <Step kind="move" to={[-55, -45]} />
        <Step kind="line" to={[-55, 45]} />
        <Step kind="line" to={[55, 45]} />
      </Path>
    </Layout>
  );
};

export default Demo;
