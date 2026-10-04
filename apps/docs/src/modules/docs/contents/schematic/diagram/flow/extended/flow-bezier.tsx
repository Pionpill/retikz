import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-bezier.controls';
import { renderFlowBezierPreview } from './flow-bezier.preview';
import { FlowCurveViewport } from './FlowCurveViewport';

export { previewControls };
const createPreview = (lang: Lang) => {
  const contract = createPreviewControlContract(lang);
  const controlled = defineControlledPreview(contract, values => (
    <FlowCurveViewport diagram={renderFlowBezierPreview(values, lang)} />
  ));
  return {
    ...controlled,
    // 自定义布局含函数，自动 IR/Vanilla 源码无法保留其注册；展示完整 React 与附属布局源码
    source: { deriveIR: false },
  };
};
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;
/** 贝塞尔曲线示例语言 */
export type FlowBezierProps = Readonly<{ lang?: Lang }>;
/** 自动与显式贝塞尔控制点试验场 */
const Demo: FC<FlowBezierProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
