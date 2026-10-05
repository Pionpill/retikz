import { Branch, BranchNode } from '@retikz/diagram-react/branch';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewBranchDiagram } from '@/modules/docs/components/component-preview/theme';

import { branchRoadmapI18n } from './branch-roadmap.i18n';

/** 路线图示例属性 */
export type BranchRoadmapProps = { lang?: Lang };

/** 版本主线和专题开发支线 */
const BranchRoadmap: FC<BranchRoadmapProps> = props => {
  const t = branchRoadmapI18n[props.lang ?? 'zh'];
  return (
    <PreviewBranchDiagram
      mainBranch="main"
      presentation={{ title: { text: t.title } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <BranchNode id="v1" labels={[{ text: 'v0.1' }]} />
      <BranchNode id="feature" labels={[{ text: t.feature, position: 'bottom' }]} />
      <BranchNode id="v2" labels={[{ text: 'v0.2' }]} />
      <BranchNode id="v3" labels={[{ text: 'v1.0' }]} />
      <Branch id="main" nodes={['v1', 'v2', 'v3']} />
      <Branch id="feature" nodes={['v1', 'feature', 'v2']} style={{ stroke: '#4f7cac' }} />
    </PreviewBranchDiagram>
  );
};
export default BranchRoadmap;
