import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { traceFlowI18n } from './trace-flow.i18n';

/** 诊断流程图的语言配置 */
export type TraceFlowProps = Readonly<{ lang?: Lang }>;

/** 展示Trace 校验、接收与诊断归并 */
const TraceFlow: FC<TraceFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = traceFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="trace-flow" kind="linear" direction="right" align="center">
        <FlowEntities items={[{ id: 'trace-flow-report', text: text.report, role: 'activity' }]} />
        <FlowEntities
          items={[{ id: 'trace-flow-validate', text: text.validate, role: 'activity', kind: 'docs.logic.important' }]}
        />
        <FlowLayout id="trace-flow-column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'trace-flow-sink', text: text.sink, role: 'activity' },
              { id: 'trace-flow-diagnostics', text: text.diagnostics, role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowEntities items={[{ id: 'trace-flow-queue', text: text.queue, role: 'activity' }]} />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'trace-flow-report', target: 'trace-flow-validate' },
          { source: 'trace-flow-validate', target: 'trace-flow-sink', label: text.valid },
          { source: 'trace-flow-validate', target: 'trace-flow-diagnostics', label: text.invalid },
          { source: 'trace-flow-sink', target: 'trace-flow-diagnostics', label: text.failed },
          { source: 'trace-flow-diagnostics', target: 'trace-flow-queue' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TraceFlow;
