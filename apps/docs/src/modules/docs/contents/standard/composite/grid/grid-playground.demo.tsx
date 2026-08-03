import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { gridPlaygroundControls, previewControlContract } from './grid-playground.controls';

export const previewControls = gridPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const bounds = {
    start: values.boundsStart,
    end: values.boundsEnd,
  };
  const spacing = values.spacingMode === 'uniform' ? values.spacing : { x: values.spacingX, y: values.spacingY };
  const origin: [number, number] | undefined = values.originEnabled ? [values.originX, values.originY] : undefined;
  const lineStyle = {
    stroke: values.lineStroke,
    strokeWidth: values.lineStrokeWidth,
    strokeOpacity: values.lineOpacity,
    ...(values.lineDashed ? { dashPattern: [6, 4] } : {}),
  };
  const major = values.majorEnabled
    ? {
        every: values.majorEvery,
        offset: values.majorOffset,
        style: {
          stroke: values.majorStroke,
          strokeWidth: values.majorStrokeWidth,
          strokeOpacity: values.majorOpacity,
          ...(values.majorDashed ? { dashPattern: [6, 4] } : {}),
        },
      }
    : undefined;
  const border = values.borderEnabled
    ? {
        padding: values.borderPadding,
        order: values.borderOrder,
        extendLines: values.borderExtendLines,
        style: {
          stroke: values.borderStroke,
          strokeWidth: values.borderStrokeWidth,
          strokeOpacity: values.borderOpacity,
          fill: values.borderFill,
          fillOpacity: values.borderFillOpacity,
          ...(values.borderDashed ? { dashPattern: [6, 4] } : {}),
        },
      }
    : undefined;
  const gridInput = {
    bounds,
    spacing,
    ...(origin === undefined ? {} : { origin }),
    lines: { includeBoundary: values.includeBoundary, style: lineStyle },
    ...(major === undefined ? {} : { major }),
    ...(border === undefined ? {} : { border }),
  };

  return (
    <Layout
      width={400}
      height={280}
      viewBox={{ x: 0, y: 0, width: 400, height: 280 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Grid {...gridInput} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Grid 范围、格距、线型、主线和边框 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
