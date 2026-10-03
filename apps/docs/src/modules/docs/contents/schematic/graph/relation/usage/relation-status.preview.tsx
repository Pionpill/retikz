import { Entity, Graph, Relation } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { relationStatusOf } from './relation-role-controls';
import { relationStatusI18n } from './relation-status.i18n';

/** 固定关系结构，只改变语义状态 */
export const RelationStatusPreview = (status: unknown, lang: Lang) => {
  const copy = relationStatusI18n[lang];
  return (
    <Graph viewBox={{ x: 0, y: 0, width: 420, height: 180 }}>
      <Entity id="source" role="activity" position={[80, 90]}>
        {copy.source}
      </Entity>
      <Entity id="target" role="activity" position={[340, 90]}>
        {copy.target}
      </Entity>
      <Relation
        id="status-demo"
        role="flow"
        source="source"
        target="target"
        direction="both"
        status={relationStatusOf(status)}
      />
    </Graph>
  );
};
