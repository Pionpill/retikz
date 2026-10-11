import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './provenance-delivery.controls';
import { ProvenanceDeliveryPreview } from './provenance-delivery.preview';

/** 控件注册基线 */
export const previewControls = previewControlContract.controls;
/** 回调的运行时事件不派生绘图 IR */
export const previewSource = { deriveIR: false };
/** 页面语言 */
export type ProvenanceDeliveryProps = { lang?: Lang };
const Demo: FC<ProvenanceDeliveryProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ProvenanceDeliveryPreview {...values} lang={lang} />;
};
export default Demo;
