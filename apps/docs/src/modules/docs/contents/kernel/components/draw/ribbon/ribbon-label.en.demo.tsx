import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ribbonLabelControls } from './ribbon-label.en.controls';

export const previewControls = ribbonLabelControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** Ribbon label property playground */
const Demo: FC = () => {
  const values = usePreviewControls(ribbonLabelControls);
  const placement =
    values.placement === 'inside' ? ({ placement: 'inside' } as const) : ({ side: values.side } as const);

  return (
    <Layout width={560} height={260} viewBox={{ x: -280, y: -130, width: 560, height: 260 }} color="#172033">
      <Path
        kind="ribbon"
        ribbon={{
          start: { width: 42 },
          end: { width: 20 },
          interpolation: 'smooth',
          samples: true,
        }}
        fill="#38bdf8"
        fillOpacity={0.62}
        label={{
          text: '128 items',
          position: values.position,
          ...placement,
          sloped: values.sloped,
          textColor: '#0f172a',
          font: { size: 14, weight: 'bold' },
        }}
      >
        <Step kind="move" to={[-210, -48]} />
        <Step kind="cubic" control1={[-80, -100]} control2={[80, 38]} to={[210, 16]} />
      </Path>
    </Layout>
  );
};

export default Demo;
