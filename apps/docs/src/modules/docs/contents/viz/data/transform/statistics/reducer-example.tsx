import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { mechanismSummary } from '../transform-mechanism.data';
import { TransformTableComparison } from '../TransformTableComparison';
import { reducerExampleI18n } from './reducer-example.i18n';

/** 原理示例的语言参数 */
export type DemoProps = { lang?: Lang };
/** 展示真实执行的输入和输出 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  return <TransformTableComparison {...reducerExampleI18n[lang]} operations={[mechanismSummary]} />;
};
export default Demo;
