import type { FC } from 'react';

import { RelationDirection } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { previewControlContract, relationAssociationControls } from './relation-association.controls';
import { defineRelationSemanticProps, relationStatusOf } from './relation-role-controls';

export const previewControls = relationAssociationControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const kindValue = typeof values.kind === 'string' ? values.kind : '';
  const directionValue = typeof values.direction === 'string' ? values.direction : 'none';
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
        对象 A
      </Entity>
      <Entity id="target" role="concept" position={[340, 90]}>
        对象 B
      </Entity>
      <Relation
        id="association-demo"
        role="association"
        status={relationStatusOf(values.status)}
        {...defineRelationSemanticProps(kind, direction)}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** association role 的方向、内置 kind 与展示 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
