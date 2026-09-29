import { RelationDirection } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { relationAssociationI18n } from './relation-association.i18n';
import { relationStatusOf } from './relation-role-controls';

/** 图形参数 */
export type RelationAssociationPreviewValues = {
  direction: string | number | boolean | [number, number];
  color: string | number | boolean | [number, number];
  status: string | number | boolean | [number, number];
};

/** 绘制示例图形 */
export const RelationAssociationPreview = (values: RelationAssociationPreviewValues, lang: Lang) => {
  const directionValue = typeof values.direction === 'string' ? values.direction : 'none';
  const color = typeof values.color === 'string' ? values.color : 'currentColor';
  const direction =
    directionValue === 'forward'
      ? RelationDirection.Forward
      : directionValue === 'reverse'
        ? RelationDirection.Reverse
        : directionValue === 'both'
          ? RelationDirection.Both
          : RelationDirection.None;
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
      <Entity id="source" role="concept" position={[80, 90]}>
        {relationAssociationI18n[lang].source}
      </Entity>
      <Entity id="target" role="concept" position={[340, 90]}>
        {relationAssociationI18n[lang].target}
      </Entity>
      <Relation
        id="association-demo"
        role="association"
        status={relationStatusOf(values.status)}
        direction={direction}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
};
