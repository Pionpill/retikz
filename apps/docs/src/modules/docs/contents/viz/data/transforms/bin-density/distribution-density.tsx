import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './distribution-density.controls';
import { distributionDensityRowsOf, distributionDensityOperationOf } from './distribution-density.data';
import { DistributionDensityPreview } from './distribution-density.preview';

/** 注册回退与静态源码使用同一控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <DistributionDensityPreview {...values} />
));
/** 源码视图展示公开变换调用，不包含辅助表格的绘制逻辑 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'distribution-density',
      distributionDensityRowsOf(),
      distributionDensityOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 双语演示入口 */
export type DistributionDensityProps = { lang?: Lang };
const Demo: FC<DistributionDensityProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <DistributionDensityPreview {...values} lang={lang} />;
};
export default Demo;
