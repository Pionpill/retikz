import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './entity-playground.controls';
import { EntityPlaygroundPreview } from './entity-playground.preview';

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    EntityPlaygroundPreview(
      {
        role: values.role,
        status: values.status,
        group: values.group,
        override: values.override,
        color: values.color,
      },
      lang,
    ),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewControls = previewControlContract.controls;

export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 实体试验场的语言 */
export type EntityPlaygroundProps = { lang?: Lang };

/** 固定位置比较角色、状态、分组色与显式外观 */
const EntityPlayground: FC<EntityPlaygroundProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default EntityPlayground;
