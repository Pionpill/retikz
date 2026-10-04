import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-smooth.controls';
import { renderFlowSmoothPreview } from './flow-smooth.preview';
import { FlowCurveViewport } from './FlowCurveViewport';

export { previewControls };
const createPreview = (lang: Lang) => {
  const contract = createPreviewControlContract(lang);
  const controlled = defineControlledPreview(contract, values => (
    <FlowCurveViewport diagram={renderFlowSmoothPreview(values, lang)} />
  ));
  return {
    ...controlled,
    source: { ...controlled.source, canonicalRender: () => renderFlowSmoothPreview(contract.canonicalValues, lang) },
  };
};
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;
/** 过点曲线示例语言 */
export type FlowSmoothProps = Readonly<{ lang?: Lang }>;
/** 有序经过点与控制臂倍率试验场 */
const Demo: FC<FlowSmoothProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
