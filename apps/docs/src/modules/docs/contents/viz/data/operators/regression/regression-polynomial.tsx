import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './regression-polynomial.controls';
import { RegressionPreview } from './regression-preview';

/** 注册回退共用控件契约 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <RegressionPreview {...values} />);
/** 稳定基线派生源码 */
export const previewSource = controlledPreview.source;
/** 图示语言 */
export type RegressionPolynomialProps = { lang?: Lang };
const Demo: FC<RegressionPolynomialProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <RegressionPreview {...values} lang={lang} />;
};
export default Demo;
