import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';
import { RibbonPathKindDefinition } from '@retikz/standard/ribbon';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, ribbonLabelControls } from './ribbon-label.en.controls';

export const previewControls = ribbonLabelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const placement =
    values.placement === 'inside' ? ({ placement: 'inside' } as const) : ({ side: values.side } as const);

  return (
    <Layout
      width={400}
      height={186}
      viewBox={{ x: -280, y: -130, width: 560, height: 260 }}
      pathKinds={[RibbonPathKindDefinition]}
      rootScope={{ style: { color: '#172033' } }}
    >
      <Path
        kind="ribbon"
        kindOptions={{
          start: { width: 42 },
          end: { width: 20 },
          interpolation: 'smooth',
          samples: true,
        }}
        label={{
          text: '128 items',
          position: values.position,
          ...placement,
          sloped: values.sloped,
          textColor: '#0f172a',
          font: { size: 14, weight: 'bold' },
        }}
        style={{ fill: '#38bdf8', fillOpacity: 0.62 }}
      >
        <Step kind="move" to={[-210, -48]} />
        <Step kind="cubic" control1={[-80, -100]} control2={[80, 38]} to={[210, 16]} />
      </Path>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Ribbon label property playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
