import type { FC } from 'react';

import { RelationDirection } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { previewControlContract, relationInfluenceControls } from './relation-influence.en.controls';

export const previewControls = relationInfluenceControls;

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
      <Entity id="source" role="concept" position={[80, 90]}>
        Factor
      </Entity>
      <Entity id="target" role="state" position={[340, 90]}>
        Outcome
      </Entity>
      <Relation
        id="influence-demo"
        role="influence"
        direction={direction}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** influence role direction and presentation controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
