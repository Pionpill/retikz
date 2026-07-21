import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathStructureControls, previewControlContract } from './path-structure.controls';

export const previewControls = pathStructureControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={218} viewBox={{ x: -220, y: -120, width: 440, height: 240 }}>
      <Path
        stroke={values.structure === 'fill' ? values.fill : 'currentColor'}
        strokeWidth={2}
        fill={values.structure === 'fill' ? values.fill : undefined}
        fillOpacity={0.35}
      >
        <Step kind="move" to={[-160, -55]} />
        {values.structure === 'subpaths' ? (
          <>
            <Step to={[-35, 45]} />
            <Step kind="move" to={[35, -45]} />
            <Step to={[160, 55]} />
          </>
        ) : (
          <>
            <Step to={[0, 55]} />
            <Step to={[160, -55]} />
            {values.structure === 'fill' && <Step kind="cycle" />}
          </>
        )}
      </Path>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Path 基础结构 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
