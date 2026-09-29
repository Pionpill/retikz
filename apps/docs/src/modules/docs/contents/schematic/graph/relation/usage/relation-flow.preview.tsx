import { RelationDirection } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { relationFlowI18n } from './relation-flow.i18n';
import { relationStatusOf } from './relation-role-controls';

/** 图形参数 */
export type RelationFlowPreviewValues = {
  direction: string | number | boolean | [number, number];
  color: string | number | boolean | [number, number];
  status: string | number | boolean | [number, number];
};

/** 绘制示例图形 */
export const RelationFlowPreview = (values: RelationFlowPreviewValues, lang: Lang) => {
  const directionValue = typeof values.direction === 'string' ? values.direction : 'forward';
  const color = typeof values.color === 'string' ? values.color : 'currentColor';
  const direction =
    directionValue === 'reverse'
      ? RelationDirection.Reverse
      : directionValue === 'both'
        ? RelationDirection.Both
        : RelationDirection.Forward;
  const relationDefaults =
    color === 'currentColor'
      ? {}
      : {
          style: { stroke: color },
          sourceMarker: { color, fill: color },
          targetMarker: { color, fill: color },
          labelTextForeground: color,
        };

  return (
    <Graph
      viewBox={{ x: 0, y: 0, width: 420, height: 180 }}
      {...(color === 'currentColor' ? {} : { graphDefaults: { relation: relationDefaults } })}
    >
      <Entity id="source" role="activity" position={[80, 90]}>
        {relationFlowI18n[lang].source}
      </Entity>
      <Entity id="target" role="activity" position={[340, 90]}>
        {relationFlowI18n[lang].target}
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
};
