import { Entity, Graph, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './semantic-roles.controls';
import { semanticRolesI18n } from './semantic-roles.i18n';

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => (
    <Graph viewBox={{ x: 0, y: 0, width: 400, height: 170 }}>
      <Entity id="request" role="participant" position={[75, 85]}>
        {semanticRolesI18n[lang].source}
      </Entity>
      <Entity
        id="process"
        role={values.entityRole}
        position={[315, 85]}
        style={{ strokeWidth: values.emphasis ? 3 : 1 }}
      >
        {semanticRolesI18n[lang].target}
      </Entity>
      <Relation role={values.relationRole} source={{ id: 'request' }} target={{ id: 'process' }} />
    </Graph>
  ));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewControls = previewControlContract.controls;
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 语义示例的语言 */
export type SemanticRolesProps = { lang?: Lang };
/** 固定对象身份和位置，仅改变角色或描边 */
const SemanticRoles: FC<SemanticRolesProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default SemanticRoles;
