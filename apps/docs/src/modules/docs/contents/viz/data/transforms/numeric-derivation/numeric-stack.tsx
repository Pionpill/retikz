import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './numeric-stack.controls';
import { numericStackRowsOf, numericStackOperationOf } from './numeric-stack.data';
import { NumericStackPreview } from './numeric-stack.preview';

/** 注册回退与静态源码使用同一控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <NumericStackPreview {...values} />
));
/** 源码视图展示公开变换调用，不包含辅助表格的绘制逻辑 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'numeric-stack',
      numericStackRowsOf(),
      numericStackOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 双语演示入口 */
export type NumericStackProps = { lang?: Lang };
const Demo: FC<NumericStackProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <NumericStackPreview {...values} lang={lang} />;
};
export default Demo;
