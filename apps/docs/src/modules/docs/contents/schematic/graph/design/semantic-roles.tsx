import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './semantic-roles.controls';
import { SemanticRolesPreview } from './semantic-roles.preview';

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    SemanticRolesPreview(
      {
        entityRole: values.entityRole,
        emphasis: values.emphasis,
        relationRole: values.relationRole,
      },
      lang,
    ),
  );
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
