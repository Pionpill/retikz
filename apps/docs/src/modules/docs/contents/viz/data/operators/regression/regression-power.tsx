import { BuiltinRegressionMethod } from '@retikz/data';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './regression-power.controls';
import { RegressionPreview } from './regression-preview';
import { regressionSourceOf } from './regression-source';

/** 注册回退共用控件契约 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <RegressionPreview {...values} method={BuiltinRegressionMethod.Power} />
));
/** 源码展示实际拟合调用与两种预测位置 */
export const previewSource = regressionSourceOf(
  'power',
  previewControlContract.canonicalValues,
  controlledPreview.source,
);
/** 图示语言 */
export type RegressionPowerProps = { lang?: Lang };
const Demo: FC<RegressionPowerProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <RegressionPreview {...values} method={BuiltinRegressionMethod.Power} lang={lang} />;
};
export default Demo;
