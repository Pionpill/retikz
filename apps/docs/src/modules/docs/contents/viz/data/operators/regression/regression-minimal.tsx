import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { RegressionPreview } from './regression-preview';

/** 最小接入预览的语言 */
export type RegressionMinimalProps = { lang?: Lang };
/** 静态展示线性拟合结果，接入代码由正文提供 */
const Demo: FC<RegressionMinimalProps> = props => {
  const { lang = 'zh' } = props;
  return <RegressionPreview lang={lang} method="linear" order={3} sampleCount={32} tail={33} />;
};
export default Demo;
