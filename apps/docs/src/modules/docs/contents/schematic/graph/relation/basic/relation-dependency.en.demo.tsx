import type { FC } from 'react';

import { Entity, Graph, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { previewControlContract, relationDependencyControls } from './relation-dependency.en.controls';
import { defineRelationSemanticProps } from './relation-role-controls';

export const previewControls = relationDependencyControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const kindValue = typeof values.kind === 'string' ? values.kind : '';
  const color = typeof values.color === 'string' ? values.color : 'currentColor';
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
        Dependent
      </Entity>
      <Entity id="target" role="resource" position={[340, 90]}>
        Dependency
      </Entity>
      <Relation
        id="dependency-demo"
        role="dependency"
        {...defineRelationSemanticProps(kindValue.length === 0 ? undefined : kindValue, undefined)}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** dependency role built-in kind and presentation controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
