import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './entity-definition.controls';
import { serviceRole, gatewayKind, availabilityPredicate, availabilityRules } from './entity-definition.data';
import { entityDefinitionI18n } from './entity-definition.i18n';

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => (
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
  ));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewControls = previewControlContract.controls;
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 自定义实体示例的语言 */
export type EntityDefinitionProps = { lang?: Lang };
/** 通过 predicate 输入驱动固定的主题规则 */
const EntityDefinition: FC<EntityDefinitionProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default EntityDefinition;
