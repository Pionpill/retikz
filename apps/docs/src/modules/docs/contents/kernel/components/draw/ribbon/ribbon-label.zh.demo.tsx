import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, ribbonLabelControls } from './ribbon-label.controls';

export const previewControls = ribbonLabelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const placement =
    values.placement === 'inside' ? ({ placement: 'inside' } as const) : ({ side: values.side } as const);

  return (
    <Layout width={400} height={186} viewBox={{ x: -280, y: -130, width: 560, height: 260 }} color="#172033">
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
          text: '128 件',
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
});

export const previewSource = controlledPreview.source;

/** Ribbon 标注属性 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
