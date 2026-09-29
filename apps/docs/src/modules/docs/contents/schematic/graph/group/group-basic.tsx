import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { groupCaptionControls, createPreviewControlContract } from './group-basic.controls';
import { GroupBasicPreview } from './group-basic.preview';

export const previewControls = groupCaptionControls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    GroupBasicPreview(
      {
        side: values.side,
        direction: values.direction,
        itemGap: values.itemGap,
        bodyGap: values.bodyGap,
      },
      lang,
    ),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 分组示例语言 */
export type GroupBasicProps = { lang?: Lang };
/** 分组交互示例 */
const Demo: FC<GroupBasicProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
