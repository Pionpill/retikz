import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathTransformControls, previewControlContract } from './path-transform.controls';

export const previewControls = pathTransformControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
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
});

export const previewSource = controlledPreview.source;

/**
 * 路径整体变换 playground
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
