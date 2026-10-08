import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { traceDiagnosticsI18n } from './trace-diagnostics.i18n';

/** 诊断流程图的语言配置 */
export type TraceDiagnosticsProps = Readonly<{ lang?: Lang }>;

/** 展示发布前后诊断的收集顺序 */
const TraceDiagnostics: FC<TraceDiagnosticsProps> = props => {
  const { lang = 'zh' } = props;
  const text = traceDiagnosticsI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="trace-diagnostics" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'trace-diagnostics-prepare', text: text.prepare, role: 'state' },
            { id: 'trace-diagnostics-observe', text: text.observe, role: 'activity' },
            { id: 'trace-diagnostics-cleanup', text: text.cleanup, role: 'activity' },
            { id: 'trace-diagnostics-complete', text: text.complete, role: 'activity', kind: 'docs.logic.important' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'trace-diagnostics-prepare', target: 'trace-diagnostics-observe' },
          { source: 'trace-diagnostics-observe', target: 'trace-diagnostics-cleanup' },
          { source: 'trace-diagnostics-cleanup', target: 'trace-diagnostics-complete' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TraceDiagnostics;
