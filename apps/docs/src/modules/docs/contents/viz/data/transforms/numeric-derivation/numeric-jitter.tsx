import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './numeric-jitter.controls';
import { numericJitterRowsOf, numericJitterOperationOf } from './numeric-jitter.data';
import { NumericJitterPreview } from './numeric-jitter.preview';

/** 注册回退与静态源码使用同一控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <NumericJitterPreview {...values} />
));
/** 源码视图展示公开变换调用，不包含辅助表格的绘制逻辑 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'numeric-jitter',
      numericJitterRowsOf(),
      numericJitterOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 双语演示入口 */
export type NumericJitterProps = { lang?: Lang };
const Demo: FC<NumericJitterProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <NumericJitterPreview {...values} lang={lang} />;
};
export default Demo;
