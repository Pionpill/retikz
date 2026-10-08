import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { traceOverviewI18n } from './trace-overview.i18n';

/** 诊断流程图的语言配置 */
export type TraceOverviewProps = Readonly<{ lang?: Lang }>;

/** 展示错误、诊断与 Trace 的信息通路 */
const TraceOverview: FC<TraceOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = traceOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="trace-overview" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[{ id: 'trace-overview-runtime', text: text.runtime, role: 'activity', kind: 'docs.logic.important' }]}
        />
        <FlowLayout id="trace-overview-column-1" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'trace-overview-failure', text: text.failure, role: 'activity' },
              { id: 'trace-overview-diagnostic', text: text.diagnostic, role: 'activity' },
              { id: 'trace-overview-trace', text: text.trace, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="trace-overview-column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'trace-overview-error', text: text.error, role: 'state' },
              { id: 'trace-overview-queue', text: text.queue, role: 'state' },
              { id: 'trace-overview-sink', text: text.sink, role: 'state' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'trace-overview-runtime', target: 'trace-overview-failure' },
          { source: 'trace-overview-runtime', target: 'trace-overview-diagnostic' },
          { source: 'trace-overview-runtime', target: 'trace-overview-trace' },
          { source: 'trace-overview-failure', target: 'trace-overview-error' },
          { source: 'trace-overview-diagnostic', target: 'trace-overview-queue' },
          { source: 'trace-overview-trace', target: 'trace-overview-sink' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TraceOverview;
