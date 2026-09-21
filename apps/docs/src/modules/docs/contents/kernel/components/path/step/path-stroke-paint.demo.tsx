import type { IRPaint } from '@retikz/core';
import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathStrokePaintControls, previewControlContract } from './path-stroke-paint.controls';

export const previewControls = pathStrokePaintControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const stops = [
    { offset: 0, color: values.startColor },
    { offset: 0.5, color: values.middleColor },
    { offset: 1, color: values.endColor },
  ];
  const gradient: IRPaint = (() => {
    switch (values.gradientKind) {
      case 'linearGradient':
        return { kind: 'linearGradient', angle: values.linearAngle, stops };
      case 'radialGradient':
        return { kind: 'radialGradient', center: values.center, radius: values.radius, stops };
      case 'conicGradient':
        return { kind: 'conicGradient', center: values.center, angle: values.conicAngle, stops };
    }
  })();

  return (
    <Layout viewBox={{ x: -210, y: -110, width: 420, height: 220 }}>
      <Path
        style={{
          stroke: gradient,
          strokeWidth: 10,
          lineCap: 'round',
        }}
      >
        <Step kind="move" to={[-165, -34]} />
        <Step kind="curve" control={[0, -112]} to={[165, -34]} />
      </Path>
      <Path style={{ fill: gradient, stroke: 'none' }}>
        <Step kind="rectangle" from={[-142, 2]} to={[142, 78]} cornerRadius={16} />
      </Path>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Path 渐变描边 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
