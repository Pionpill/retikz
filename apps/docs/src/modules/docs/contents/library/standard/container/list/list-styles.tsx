import { Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './list-styles.controls';

/** Fallback controls for preview registration. */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout viewBox={{ x: -78, y: -115, width: 360, height: 290 }}>
    <List
      index={
        values.indexEnabled
          ? {
              position: values.indexPosition,
              start: values.indexStart,
              style: {
                font: { size: values.indexFontSize, weight: values.indexFontWeight },
                textColor: values.indexTextColor,
              },
            }
          : false
      }
      layout={{
        direction: values.direction,
        width: values.widthMode === 'fixed' ? values.width : values.widthMode,
        height: values.autoHeight ? 'auto' : values.height,
        padding: values.padding,
        gap: values.gap,
      }}
      style={{
        fill: values.fill,
        fillOpacity: 0.25,
        stroke: values.stroke,
        strokeWidth: values.strokeWidth,
        cornerRadius: values.cornerRadius,
        font: { size: values.fontSize },
      }}
      items={['A', 'B1', 'C'].map(content => ({
        content,
        ...(content === 'B1' && values.override ? { style: { fill: '#2563eb', fillOpacity: 0.4 } } : {}),
      }))}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
