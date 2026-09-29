import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './relation-association.controls';
import { RelationAssociationPreview } from './relation-association.preview';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    RelationAssociationPreview(
      {
        direction: values.direction,
        color: values.color,
        status: values.status,
      },
      lang,
    ),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 关系示例语言 */
export type RelationAssociationProps = { lang?: Lang };
/** 比较关系方向与外观 */
const RelationAssociation: FC<RelationAssociationProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default RelationAssociation;
