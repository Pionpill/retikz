import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelStyleControls, previewControlContract } from './node-label-style.controls';

export const previewControls = nodeLabelStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout>
    <Node
      position={[0, 0]}
      label={{
        text: 'styled label',
        position: 'right',
        placement: 'outside',
        textColor: values.textColor,
        font: { size: values.fontSize },
        opacity: values.opacity,
      }}
      style={{ fill: 'lightgray', stroke: 'gray' }}
      layout={{ minimumSize: { width: 120, height: 76 } }}
    >
      q
    </Node>
  </Layout>
));

export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
