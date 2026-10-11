import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './provenance-rows.controls';
import { ProvenanceRowsPreview } from './provenance-rows.preview';

/** 控件注册基线 */
export const previewControls = previewControlContract.controls;
/** 来源表的稳定源码 */
export const previewSource = defineControlledPreview(previewControlContract, values => (
  <ProvenanceRowsPreview {...values} />
)).source;
/** 页面语言 */
export type ProvenanceRowsProps = { lang?: Lang };
const Demo: FC<ProvenanceRowsProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ProvenanceRowsPreview {...values} lang={lang} />;
};
export default Demo;
