import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelListControls, previewControlContract } from './node-label-list.en.controls';

export const previewControls = nodeLabelListControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout>
    <Node
      position={[0, 0]}
      label={
        values.mode === 'multiple'
          ? [
              { text: 'status', position: 'top' },
              { text: 'owner', position: 'bottom' },
            ]
          : { text: 'status', position: 'top' }
      }
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
