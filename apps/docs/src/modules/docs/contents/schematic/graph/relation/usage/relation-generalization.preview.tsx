import { Entity, Graph, Relation } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { relationGeneralizationI18n } from './relation-generalization.i18n';
import { relationStatusOf } from './relation-role-controls';

/** 图形参数 */
export type RelationGeneralizationPreviewValues = {
  color: string | number | boolean | [number, number];
  status: string | number | boolean | [number, number];
};

/** 绘制示例图形 */
export const RelationGeneralizationPreview = (values: RelationGeneralizationPreviewValues, lang: Lang) => {
  const color = typeof values.color === 'string' ? values.color : 'currentColor';
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
        {relationGeneralizationI18n[lang].source}
      </Entity>
      <Entity id="target" role="concept" position={[340, 90]}>
        {relationGeneralizationI18n[lang].target}
      </Entity>
      <Relation
        id="generalization-demo"
        role="generalization"
        status={relationStatusOf(values.status)}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        way={['source', 'target']}
      />
    </Graph>
  );
};
