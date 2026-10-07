import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { computationOverviewI18n } from './computation-overview.i18n';

/** 总览图的语言配置 */
export type ComputationOverviewProps = Readonly<{ lang?: Lang }>;

/** 展示计算定义到结果释放的主线 */
const ComputationOverview: FC<ComputationOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = computationOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="computation-overview" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'computation-overview-define', text: text.define, role: 'activity' },
            { id: 'computation-overview-register', text: text.register, role: 'activity' },
            { id: 'computation-overview-execute', text: text.execute, role: 'activity' },
            { id: 'computation-overview-read', text: text.read, role: 'activity' },
            { id: 'computation-overview-dispose', text: text.dispose, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'computation-overview-define', target: 'computation-overview-register' },
          { source: 'computation-overview-register', target: 'computation-overview-execute' },
          { source: 'computation-overview-execute', target: 'computation-overview-read' },
          { source: 'computation-overview-read', target: 'computation-overview-dispose' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ComputationOverview;
