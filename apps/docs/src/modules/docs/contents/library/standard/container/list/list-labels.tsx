import { Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './list-labels.controls';

/** Fallback controls for preview registration. */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout viewBox={{ x: -120, y: -120, width: 440, height: 280 }}>
    <List
      items={['A', 'B', 'C']}
      layout={{ width: 56, height: 40, gap: 6 }}
      label={{
        text: values.text,
        position:
          values.positionMode === 'boundary'
            ? { boundary: values.boundary, fraction: values.fraction }
            : values.direction,
        align: values.align,
        distance: values.distance,
        rotate: values.rotate,
        font: { size: values.fontSize },
        textColor: values.color,
        pin: values.pin ? { stroke: values.color, strokeWidth: 1 } : false,
      }}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
