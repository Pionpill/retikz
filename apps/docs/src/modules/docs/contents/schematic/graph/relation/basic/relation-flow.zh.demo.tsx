import type { FC } from 'react';

import { RelationDirection } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { previewControlContract, relationFlowControls } from './relation-flow.controls';
import { relationStatusOf } from './relation-role-controls';

export const previewControls = relationFlowControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const directionValue = typeof values.direction === 'string' ? values.direction : 'forward';
  const color = typeof values.color === 'string' ? values.color : 'currentColor';
  const direction =
    directionValue === 'reverse'
      ? RelationDirection.Reverse
      : directionValue === 'both'
        ? RelationDirection.Both
        : RelationDirection.Forward;
  const relationTokens =
    color === 'currentColor'
      ? {}
      : {
          stroke: color,
          sourceMarker: { color, fill: color },
          targetMarker: { color, fill: color },
          labelTextForeground: color,
        };

  return (
    <Graph
      width={420}
      height={180}
      viewBox={{ x: 0, y: 0, width: 420, height: 180 }}
      {...(color === 'currentColor'
        ? {}
        : { graphTheme: { rules: [{ type: 'relation', appearance: relationTokens }] } })}
    >
      <Entity id="source" role="activity" position={[80, 90]}>
        发送
      </Entity>
      <Entity id="target" role="activity" position={[340, 90]}>
        接收
      </Entity>
      <Relation
        id="flow-demo"
        role="flow"
        status={relationStatusOf(values.status)}
        direction={direction}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** flow role 的方向与展示 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
