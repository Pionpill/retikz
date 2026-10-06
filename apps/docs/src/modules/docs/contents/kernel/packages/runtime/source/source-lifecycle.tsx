import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { sourceLifecycleI18n } from './source-lifecycle.i18n';

/** 生命周期图的语言配置 */
export type SourceLifecycleProps = Readonly<{ lang?: Lang }>;

/** 比较结果决定候选状态是立即清理还是继续参与事务 */
const SourceLifecycle: FC<SourceLifecycleProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = sourceLifecycleI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="lifecycle" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'prepare', text: i18n.prepare, role: 'activity' },
            { id: 'compare', text: i18n.compare, role: 'gateway' },
          ]}
        />
        <FlowLayout id="outcomes" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'retire', text: i18n.retire, role: 'activity' },
              { id: 'runtime', text: i18n.runtime, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'prepare', target: 'compare' },
          { source: 'compare', target: 'retire', label: i18n.equal },
          { source: 'compare', target: 'runtime', label: i18n.changed },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default SourceLifecycle;
