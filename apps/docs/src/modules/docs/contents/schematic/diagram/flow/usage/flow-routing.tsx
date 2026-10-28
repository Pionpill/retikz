import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-routing.controls';
import { renderFlowRoutingPreview } from './flow-routing.preview';

export { previewControls };

const createPreview = (lang: Lang) => {
  const contract = createPreviewControlContract(lang);
  const controlled = defineControlledPreview(contract, values => renderFlowRoutingPreview(values));

  return {
    ...controlled,
    source: { ...controlled.source, canonicalRender: () => renderFlowRoutingPreview(contract.canonicalValues) },
  };
};

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** 当前语言的连线路由交互示例 */
export type FlowRoutingProps = Readonly<{ lang?: Lang }>;

/** 比较直线、折线与三类曲线路由 */
const Demo: FC<FlowRoutingProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
