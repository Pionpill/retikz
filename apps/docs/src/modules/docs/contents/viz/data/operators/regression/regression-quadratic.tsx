import { BuiltinRegressionMethod } from '@retikz/data';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { RegressionPreview } from './regression-preview';
import { createPreviewControlContract, previewControlContract } from './regression-quadratic.controls';
import { regressionSourceOf } from './regression-source';

/** 注册回退共用控件契约 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <RegressionPreview {...values} method={BuiltinRegressionMethod.Quadratic} />
));
/** 源码展示实际拟合调用与两种预测位置 */
export const previewSource = regressionSourceOf(
  'quadratic',
  previewControlContract.canonicalValues,
  controlledPreview.source,
);
/** 图示语言 */
export type RegressionQuadraticProps = { lang?: Lang };
const Demo: FC<RegressionQuadraticProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <RegressionPreview {...values} method={BuiltinRegressionMethod.Quadratic} lang={lang} />;
};
export default Demo;
