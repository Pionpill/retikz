import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { lifecycleDisposalI18n } from './lifecycle-disposal.i18n';

/** 生命周期图的语言 */
export type LifecycleDisposalProps = Readonly<{ lang?: Lang }>;
/** 展示1. 停止更新与状态读取及相关状态变化 */
const LifecycleDisposal: FC<LifecycleDisposalProps> = props => {
  const { lang = 'zh' } = props;
  const text = lifecycleDisposalI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="lifecycle-disposal" kind="linear" direction="down" align="center" containerWidth="match-largest">
        <FlowLayout id="lifecycle-disposal-row-0" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-disposal-0', text: text.n0, role: 'activity' },
              { id: 'lifecycle-disposal-1', text: text.n1, role: 'activity' },
              { id: 'lifecycle-disposal-2', text: text.n2, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="lifecycle-disposal-row-1" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-disposal-3', text: text.n3, role: 'activity' },
              { id: 'lifecycle-disposal-4', text: text.n4, role: 'activity' },
              { id: 'lifecycle-disposal-5', text: text.n5, role: 'state', kind: 'docs.logic.importantData' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'lifecycle-disposal-0', target: 'lifecycle-disposal-1' },
          { source: 'lifecycle-disposal-1', target: 'lifecycle-disposal-2' },
          { source: 'lifecycle-disposal-2', target: 'lifecycle-disposal-3', routing: { kind: 'orthogonal' } },
          { source: 'lifecycle-disposal-3', target: 'lifecycle-disposal-4' },
          { source: 'lifecycle-disposal-4', target: 'lifecycle-disposal-5' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default LifecycleDisposal;
