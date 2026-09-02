import type { FC } from 'react';

import { RelationDirection } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { previewControlContract, relationAssociationControls } from './relation-association.en.controls';
import { defineRelationSemanticProps } from './relation-role-controls';

export const previewControls = relationAssociationControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const kindValue = typeof values.kind === 'string' ? values.kind : '';
  const directionValue = typeof values.direction === 'string' ? values.direction : 'forward';
  const color = typeof values.color === 'string' ? values.color : 'currentColor';
  const kind = kindValue.length === 0 ? undefined : kindValue;
  const direction =
    kind === undefined
      ? directionValue === 'forward'
        ? RelationDirection.Forward
        : directionValue === 'reverse'
          ? RelationDirection.Reverse
          : directionValue === 'both'
            ? RelationDirection.Both
            : RelationDirection.None
      : undefined;
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
        Object A
      </Entity>
      <Entity id="target" role="concept" position={[340, 90]}>
        Object B
      </Entity>
      <Relation
        id="association-demo"
        role="association"
        {...defineRelationSemanticProps(kind, direction)}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** association role direction, built-in kind, and presentation controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
