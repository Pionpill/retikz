import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-endpoints.controls';
import { renderFlowEndpointsPreview } from './flow-endpoints.preview';

export { previewControls };
const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowEndpointsPreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** 单侧自动分离示例的语言参数 */
export type FlowEndpointsProps = { lang?: Lang };

/** 控制左侧节点数量，观察连接位置自动等分 */
const FlowEndpoints: FC<FlowEndpointsProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default FlowEndpoints;
