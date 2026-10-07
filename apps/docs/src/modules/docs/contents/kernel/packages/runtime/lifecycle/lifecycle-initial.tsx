import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { lifecycleInitialI18n } from './lifecycle-initial.i18n';

/** 生命周期图的语言 */
export type LifecycleInitialProps = Readonly<{ lang?: Lang }>;
/** 展示1. 来源准备及相关状态变化 */
const LifecycleInitial: FC<LifecycleInitialProps> = props => {
  const { lang = 'zh' } = props;
  const text = lifecycleInitialI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="lifecycle-initial" kind="linear" direction="down" align="center" containerWidth="match-largest">
        <FlowLayout id="lifecycle-initial-row-0" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-initial-0', text: text.n0, role: 'activity' },
              { id: 'lifecycle-initial-1', text: text.n1, role: 'activity' },
              { id: 'lifecycle-initial-2', text: text.n2, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="lifecycle-initial-row-1" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-initial-3', text: text.n3, role: 'activity' },
              { id: 'lifecycle-initial-4', text: text.n4, role: 'state', kind: 'docs.logic.importantData' },
              { id: 'lifecycle-initial-5', text: text.n5, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'lifecycle-initial-0', target: 'lifecycle-initial-1' },
          { source: 'lifecycle-initial-1', target: 'lifecycle-initial-2' },
          { source: 'lifecycle-initial-2', target: 'lifecycle-initial-3', routing: { kind: 'orthogonal' } },
          { source: 'lifecycle-initial-3', target: 'lifecycle-initial-4' },
          { source: 'lifecycle-initial-4', target: 'lifecycle-initial-5' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default LifecycleInitial;
