import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { lifecycleOverviewI18n } from './lifecycle-overview.i18n';

/** 生命周期图的语言 */
export type LifecycleOverviewProps = Readonly<{ lang?: Lang }>;
/** 展示定义与注册及相关状态变化 */
const LifecycleOverview: FC<LifecycleOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = lifecycleOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="lifecycle-overview" kind="linear" direction="down" align="center">
        <FlowLayout id="lifecycle-overview-row-0" kind="linear" direction="right" align="center">
          <FlowEntities
            items={[
              { id: 'lifecycle-overview-0', text: text.n0, role: 'activity' },
              { id: 'lifecycle-overview-1', text: text.n1, role: 'state', kind: 'docs.logic.importantData' },
              { id: 'lifecycle-overview-2', text: text.n2, role: 'activity' },
              { id: 'lifecycle-overview-3', text: text.n3, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'lifecycle-overview-0', target: 'lifecycle-overview-1' },
          { source: 'lifecycle-overview-1', target: 'lifecycle-overview-2' },
          { source: 'lifecycle-overview-2', target: 'lifecycle-overview-3' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default LifecycleOverview;
