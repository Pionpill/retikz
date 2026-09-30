import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-routing.controls';
import { renderFlowRoutingPreview } from './flow-routing.preview';

export { previewControls };

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowRoutingPreview(values));

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;
/** 当前语言的连线路由交互示例 */
export type FlowRoutingProps = Readonly<{ lang?: Lang }>;
/** 切换四种连线路由 */
const Demo: FC<FlowRoutingProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
