import { Branch, BranchNode } from '@retikz/diagram-react/branch';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewBranchDiagram } from '@/modules/docs/components/component-preview/theme';

import { branchHistoryI18n } from './branch-history.i18n';

/** 提交历史示例属性 */
export type BranchHistoryProps = { lang?: Lang };
/** 用共享节点声明分叉和合并 */
const BranchHistory: FC<BranchHistoryProps> = props => {
  const t = branchHistoryI18n[props.lang ?? 'zh'];
  return (
    <PreviewBranchDiagram
      mainBranch="main"
      layout={{ direction: 'down' }}
      presentation={{ title: { text: t.title } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <BranchNode id="a" labels={[{ text: t.initial, position: 'left' }]} />
      <BranchNode id="b" labels={[{ text: t.fix, position: 'right' }]} />
      <BranchNode
        id="c"
        labels={[
          { text: t.merge, position: 'left' },
          { text: 'HEAD', position: 'bottom' },
        ]}
      />
      <Branch id="main" nodes={['a', 'c']} />
      <Branch id="fix" nodes={['a', 'b', 'c']} style={{ stroke: '#4f7cac' }} />
    </PreviewBranchDiagram>
  );
};
export default BranchHistory;
