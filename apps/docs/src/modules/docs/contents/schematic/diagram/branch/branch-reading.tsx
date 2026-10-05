import { Branch, BranchNode } from '@retikz/diagram-react/branch';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewBranchDiagram } from '@/modules/docs/components/component-preview/theme';

import { branchReadingI18n } from './branch-reading.i18n';

/** 阅读路线示例属性 */
export type BranchReadingProps = { lang?: Lang };
/** 上下篇主线与有序延伸阅读 */
const BranchReading: FC<BranchReadingProps> = props => {
  const t = branchReadingI18n[props.lang ?? 'zh'];
  return (
    <PreviewBranchDiagram
      mainBranch="reading"
      presentation={{ title: { text: t.title } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <BranchNode id="intro" labels={[{ text: t.start }]} />
      <BranchNode id="usage" labels={[{ text: t.usage }]} />
      <BranchNode id="extended" labels={[{ text: t.extended, position: 'bottom' }]} />
      <BranchNode id="example" labels={[{ text: t.finish }]} />
      <Branch id="reading" nodes={['intro', 'usage', 'example']} />
      <Branch id="extended" nodes={['usage', 'extended', 'example']} style={{ stroke: '#4f7cac' }} />
    </PreviewBranchDiagram>
  );
};
export default BranchReading;
