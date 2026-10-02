import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './relation-status.controls';
import { RelationStatusPreview } from './relation-status.preview';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => RelationStatusPreview(values.status, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 语义状态示例语言 */
export type RelationStatusProps = { lang?: Lang };

/** 切换状态并观察路径与两端 marker 的变化 */
const RelationStatus: FC<RelationStatusProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default RelationStatus;
