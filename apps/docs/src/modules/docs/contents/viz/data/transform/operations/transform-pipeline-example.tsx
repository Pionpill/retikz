import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { mechanismPipeline } from '../transform-mechanism.data';
import { TransformTableComparison } from '../TransformTableComparison';
import { transformPipelineExampleI18n } from './transform-pipeline-example.i18n';

/** 原理示例的语言参数 */
export type DemoProps = { lang?: Lang };
/** 展示真实执行的输入和输出 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  return <TransformTableComparison {...transformPipelineExampleI18n[lang]} operations={mechanismPipeline} />;
};
export default Demo;
