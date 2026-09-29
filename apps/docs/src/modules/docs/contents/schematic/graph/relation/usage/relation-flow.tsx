import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './relation-flow.controls';
import { RelationFlowPreview } from './relation-flow.preview';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    RelationFlowPreview(
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
export type RelationFlowProps = { lang?: Lang };
/** 比较关系方向与外观 */
const RelationFlow: FC<RelationFlowProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default RelationFlow;
