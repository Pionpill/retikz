import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathMarksControls, previewControlContract } from './path-marks.controls';

export const previewControls = pathMarksControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={360} height={160} viewBox={{ x: -180, y: -80, width: 360, height: 160 }}>
      <Path
        stroke="currentColor"
        strokeWidth={1.5}
        marks={[
          { pos: values.firstPosition, mark: { kind: 'arrow', shape: 'stealth' } },
          { pos: values.secondPosition, mark: { kind: 'arrow', shape: 'stealth' } },
        ]}
      >
        <Step kind="move" to={[-150, 20]} />
        <Step kind="cubic" control1={[-80, -70]} control2={[80, 90]} to={[150, 20]} />
      </Path>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * 中段 marking 位置 playground
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
