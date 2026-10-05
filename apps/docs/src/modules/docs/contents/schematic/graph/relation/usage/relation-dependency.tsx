import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './relation-dependency.controls';
import { RelationDependencyPreview } from './relation-dependency.preview';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    RelationDependencyPreview(
      {
        color: values.color,
        status: values.status,
      },
      lang,
    ),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 关系示例语言 */
export type RelationDependencyProps = { lang?: Lang };

/** 比较关系方向与外观 */
const RelationDependency: FC<RelationDependencyProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default RelationDependency;
