import type { FC } from 'react';

import { Entity, Graph, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { previewControlContract, relationDependencyControls } from './relation-dependency.controls';
import { defineRelationSemanticProps, relationStatusOf } from './relation-role-controls';

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
        依赖方
      </Entity>
      <Entity id="target" role="resource" position={[340, 90]}>
        被依赖方
      </Entity>
      <Relation
        id="dependency-demo"
        role="dependency"
        status={relationStatusOf(values.status)}
        {...defineRelationSemanticProps(kindValue.length === 0 ? undefined : kindValue, undefined)}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** dependency role 的内置 kind 与展示 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
