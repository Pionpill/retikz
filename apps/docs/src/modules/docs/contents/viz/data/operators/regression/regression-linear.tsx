import { BuiltinRegressionMethod } from '@retikz/data';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './regression-linear.controls';
import { RegressionPreview } from './regression-preview';
import { regressionSourceOf } from './regression-source';

/** 注册回退共用控件契约 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <RegressionPreview {...values} method={BuiltinRegressionMethod.Linear} />
));
/** 源码展示实际拟合调用与两种预测位置 */
export const previewSource = regressionSourceOf(
  'linear',
  previewControlContract.canonicalValues,
  controlledPreview.source,
);
/** 图示语言 */
export type RegressionLinearProps = { lang?: Lang };
const Demo: FC<RegressionLinearProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <RegressionPreview {...values} method={BuiltinRegressionMethod.Linear} lang={lang} />;
};
export default Demo;
