import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './relation-style.controls';
import { RelationStylePreview } from './relation-style.preview';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    RelationStylePreview({
      role: values.role,
      content: values.content,
      sourceColor: values.sourceColor,
      targetColor: values.targetColor,
      stroke: values.stroke,
      strokeWidth: values.strokeWidth,
      opacity: values.opacity,
      labelTextColor: values.labelTextColor,
      labelOpacity: values.labelOpacity,
      status: values.status,
      dashed: values.dashed,
    }),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 关系样式示例语言 */
export type RelationStyleProps = { lang?: Lang };

/** 分别调整节点、路径与标签外观 */
const RelationStyle: FC<RelationStyleProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default RelationStyle;
