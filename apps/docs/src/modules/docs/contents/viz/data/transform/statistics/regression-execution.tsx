import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { TransformMechanismFlow } from '../TransformMechanismFlow';
import { regressionExecutionI18n } from './regression-execution.i18n';

/** 拟合流程图语言 */
export type RegressionExecutionProps = { lang?: Lang };
/** 每组先拟合模型，再通过宿主采样生成行 */
const Demo: FC<RegressionExecutionProps> = props => {
  const { lang = 'zh' } = props;
  return <TransformMechanismFlow stages={regressionExecutionI18n[lang]} />;
};
export default Demo;
