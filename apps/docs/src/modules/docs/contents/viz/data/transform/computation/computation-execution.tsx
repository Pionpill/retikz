import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { TransformMechanismFlow } from '../TransformMechanismFlow';
import { computationExecutionI18n } from './computation-execution.i18n';

/** 流程图语言参数 */
export type DemoProps = { lang?: Lang };
/** 展示计算契约的执行流程 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  return <TransformMechanismFlow stages={computationExecutionI18n[lang]} direction="down" />;
};
export default Demo;
