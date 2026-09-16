import { Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { layoutViewboxControls, previewControlContract } from './layout-viewbox.controls';

export const previewControls = layoutViewboxControls;

const VIEWBOX_GUIDE_INSET = 2;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const viewBoxGuideWidth = Math.max(0, values.viewBoxWidth - VIEWBOX_GUIDE_INSET * 2);
  const viewBoxGuideHeight = Math.max(0, values.viewBoxHeight - VIEWBOX_GUIDE_INSET * 2);

  return (
    <Layout
      style={{ outline: '1px dashed gray', outlineOffset: '-1px' }}
      viewBox={
        values.viewBoxEnabled
          ? {
              x: values.viewBoxX,
              y: values.viewBoxY,
              width: values.viewBoxWidth,
              height: values.viewBoxHeight,
            }
          : undefined
      }
    >
      <Node
        id="o"
        position={[0, 0]}
        shape="circle"
        style={{ fill: 'dodgerblue', textColor: 'white' }}
        layout={{ minimumSize: 44 }}
      >
        0,0
      </Node>
      <Node id="c" position={[70, 70]} shape="circle" style={{ fill: 'darkorange' }} layout={{ minimumSize: 24 }} />
      {values.viewBoxEnabled && (
        <Rectangle
          center={[values.viewBoxX + values.viewBoxWidth / 2, values.viewBoxY + values.viewBoxHeight / 2]}
          width={viewBoxGuideWidth}
          height={viewBoxGuideHeight}
          style={{ fill: 'none', stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
        />
      )}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Toggle explicit framing and automatic bounds around the two circles */
const Demo: FC = controlledPreview.Component;

export default Demo;
