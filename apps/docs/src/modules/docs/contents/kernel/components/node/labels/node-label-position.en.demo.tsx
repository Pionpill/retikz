import { Layout, Node } from '@retikz/react';
import type { InputNodeLabel } from '@retikz/vanilla';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeLabelPositionControls, previewControlContract } from './node-label-position.en.controls';

export const previewControls = nodeLabelPositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const position: InputNodeLabel['position'] =
    values.positionMode === 'center'
      ? 'center'
      : values.positionMode === 'angle'
        ? values.positionAngle
        : values.positionMode === 'boundary'
          ? { boundary: values.boundary, fraction: values.fraction }
          : values.direction;
  return (
    <Layout>
      <Node
        position={[0, 0]}
        label={{ text: 'label', position }}
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
