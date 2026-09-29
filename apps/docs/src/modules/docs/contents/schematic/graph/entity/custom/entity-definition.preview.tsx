import { Entity, Graph } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { serviceRole, gatewayKind, availabilityPredicate, availabilityRules } from './entity-definition.data';
import { entityDefinitionI18n } from './entity-definition.i18n';

/** 图形参数 */
export type EntityDefinitionPreviewValues = {
  status: string;
  critical: boolean;
};

/** 绘制示例图形 */
export const EntityDefinitionPreview = (values: EntityDefinitionPreviewValues, lang: Lang) => (
  <Graph
    viewBox={{ x: 0, y: 0, width: 420, height: 180 }}
    entityRoles={[serviceRole]}
    entityKinds={[gatewayKind]}
    entityPredicates={[availabilityPredicate]}
    graphRules={availabilityRules}
  >
    <Entity
      id="gateway"
      role="service"
      kind="service.gateway"
      predicate={{ name: 'service.availability', params: { status: values.status, critical: values.critical } }}
      position={[210, 90]}
    >
      {entityDefinitionI18n[lang].gateway}
    </Entity>
  </Graph>
);
