import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './entity-style-size.controls';
import { EntityStyleSizePreview } from './entity-style-size.preview';

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    EntityStyleSizePreview(
      {
        color: values.color,
        fill: values.fill,
        strokeWidth: values.strokeWidth,
        maxTextWidth: values.maxTextWidth,
        lineHeight: values.lineHeight,
        minimumWidth: values.minimumWidth,
      },
      lang,
    ),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewControls = previewControlContract.controls;

export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 样式与尺寸试验场的语言 */
export type EntityStyleSizeProps = { lang?: Lang };

/** 调整实体外观、文字排布与最小宽度 */
const EntityStyleSize: FC<EntityStyleSizeProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default EntityStyleSize;
