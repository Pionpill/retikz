import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './trend-smooth.controls';
import { trendSmoothRowsOf, trendSmoothOperationOf } from './trend-smooth.data';
import { TrendSmoothPreview } from './trend-smooth.preview';

/** 注册回退与静态源码使用同一控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <TrendSmoothPreview {...values} />);
/** 源码视图展示公开变换调用，不包含辅助表格的绘制逻辑 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'trend-smooth',
      trendSmoothRowsOf(),
      trendSmoothOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 双语演示入口 */
export type TrendSmoothProps = { lang?: Lang };
const Demo: FC<TrendSmoothProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <TrendSmoothPreview {...values} lang={lang} />;
};
export default Demo;
