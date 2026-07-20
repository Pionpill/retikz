import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathMarksControls } from './path-marks.controls';

export const previewControls = pathMarksControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/**
 * 中段 marking 位置 playground
 */
const Demo: FC = () => {
  const values = usePreviewControls(pathMarksControls);

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
};

export default Demo;
