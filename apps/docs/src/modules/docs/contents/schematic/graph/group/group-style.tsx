import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { groupStyleControls, createPreviewControlContract } from './group-style.controls';
import { GroupStylePreview } from './group-style.preview';

export const previewControls = groupStyleControls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    GroupStylePreview(
      {
        backgroundColor: values.backgroundColor,
        backgroundOpacity: values.backgroundOpacity,
        borderColor: values.borderColor,
        borderWidth: values.borderWidth,
        borderOpacity: values.borderOpacity,
        cornerRadius: values.cornerRadius,
        padding: values.padding,
        borderLineStyle: values.borderLineStyle,
      },
      lang,
    ),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 分组示例语言 */
export type GroupStyleProps = { lang?: Lang };

/** 分组交互示例 */
const Demo: FC<GroupStyleProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
