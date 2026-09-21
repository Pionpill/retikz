import { Layout, Node } from '@retikz/react';
import type { InputNodeLabel } from '@retikz/vanilla';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelRotatePinControls, previewControlContract } from './node-label-rotate-pin.en.controls';

export const previewControls = nodeLabelRotatePinControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const rotate: InputNodeLabel['rotate'] = values.rotateMode === 'angle' ? values.rotateAngle : values.rotateMode;
  const pin: InputNodeLabel['pin'] =
    values.pinStyle === 'none'
      ? undefined
      : {
          stroke: values.pinColor,
          strokeWidth: values.pinWidth,
          ...(values.pinStyle === 'dashed' ? { dashPattern: [4, 3], dashOffset: values.pinDashOffset } : {}),
        };
  return (
    <Layout>
      <Node
        position={[0, 0]}
        label={{
          text: 'label',
          position: 'right',
          distance: 32,
          rotate,
          keepUpright: values.keepUpright,
          textColor: '#2563eb',
          pin,
        }}
        style={{ fill: 'lightgray', stroke: 'gray' }}
        layout={{ minimumSize: { width: 120, height: 76 } }}
      >
        q
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
