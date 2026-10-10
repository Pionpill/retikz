import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { RegressionPreview } from '../../operators/regression/regression-preview';

/** 拟合对照图语言 */
export type RegressionExampleProps = { lang?: Lang };
/** 复用同一组实际观测与 smooth 绘制，静态解释输入与预测的区别 */
const Demo: FC<RegressionExampleProps> = props => {
  const { lang = 'zh' } = props;
  return <RegressionPreview lang={lang} method="linear" order={3} sampleCount={32} tail={33} />;
};
export default Demo;
