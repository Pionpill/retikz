import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-orthogonal.controls';
import { renderFlowOrthogonalPreview } from './flow-orthogonal.preview';
import { FlowCurveViewport } from './FlowCurveViewport';

export { previewControls };
const createPreview = (lang: Lang) => {
  const contract = createPreviewControlContract(lang);
  const controlled = defineControlledPreview(contract, values => (
    <FlowCurveViewport orthogonal diagram={renderFlowOrthogonalPreview(values, lang)} />
  ));

  return {
    ...controlled,
    source: {
      ...controlled.source,
      canonicalRender: () => renderFlowOrthogonalPreview(contract.canonicalValues, lang),
    },
  };
};

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** 正交避让示例语言 */
export type FlowOrthogonalProps = Readonly<{ lang?: Lang }>;

/** 正交候选与对齐退化试验场 */
const Demo: FC<FlowOrthogonalProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
