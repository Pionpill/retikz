import { Entity, Graph, Relation } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { semanticRolesI18n } from './semantic-roles.i18n';

/** 图形参数 */
export type SemanticRolesPreviewValues = {
  entityRole: string;
  emphasis: boolean;
  relationRole: string;
};

/** 绘制示例图形 */
export const SemanticRolesPreview = (values: SemanticRolesPreviewValues, lang: Lang) => (
  <Graph viewBox={{ x: 0, y: 0, width: 400, height: 170 }}>
    <Entity id="request" role="participant" position={[75, 85]}>
      {semanticRolesI18n[lang].source}
    </Entity>
    <Entity id="process" role={values.entityRole} position={[315, 85]} style={{ strokeWidth: values.emphasis ? 3 : 1 }}>
      {semanticRolesI18n[lang].target}
    </Entity>
    <Relation role={values.relationRole} source={{ id: 'request' }} target={{ id: 'process' }} />
  </Graph>
);
