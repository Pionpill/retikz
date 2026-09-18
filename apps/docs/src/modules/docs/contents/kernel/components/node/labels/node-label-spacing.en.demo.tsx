import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelSpacingControls, previewControlContract } from './node-label-spacing.en.controls';

export const previewControls = nodeLabelSpacingControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout>
    <Node
      position={[0, 0]}
      label={{
        text: 'label',
        position: values.direction,
        placement: values.placement,
        distance: values.distance,
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
