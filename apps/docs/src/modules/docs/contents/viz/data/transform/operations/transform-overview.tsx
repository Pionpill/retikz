import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { TransformMechanismFlow } from '../TransformMechanismFlow';
import { transformOverviewI18n } from './transform-overview.i18n';

/** 流程图语言参数 */
export type DemoProps = { lang?: Lang };
/** 显示当前范围内的执行链 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  return <TransformMechanismFlow stages={transformOverviewI18n[lang]} direction="right" />;
};
export default Demo;
