import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './provenance-events.controls';
import { ProvenanceEventsPreview } from './provenance-events.preview';

/** 控件注册基线 */
export const previewControls = previewControlContract.controls;
/** 配置与事件清单是运行时结果，不派生绘图 IR */
export const previewSource = { deriveIR: false };
/** 页面语言 */
export type ProvenanceEventsProps = { lang?: Lang };
const Demo: FC<ProvenanceEventsProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ProvenanceEventsPreview {...values} lang={lang} />;
};
export default Demo;
