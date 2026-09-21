import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { inspectOutputFlowI18n } from './inspect-output-flow.i18n';

export type InspectOutputFlowProps = Readonly<{ lang?: Lang }>;
const InspectOutputFlow: FC<InspectOutputFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = inspectOutputFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="linear" id="all" direction="down" gap={48} align="center">
        <FlowLayout kind="linear" id="row0" direction="right" gap={32} align="center">
          <FlowEntities
            items={[
              { id: 'options', text: i18n.options, role: 'activity' },
              { id: 'inspect', text: i18n.inspect, role: 'activity' },
              { id: 'subject', text: i18n.subject, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="row1" direction="right" gap={32} align="center">
          <FlowEntities
            items={[
              { id: 'fragment', text: i18n.fragment, role: 'activity' },
              { id: 'compile', text: i18n.compile, role: 'activity' },
              { id: 'layers', text: i18n.layers, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'options', target: 'inspect', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'subject', target: 'inspect', routing: { kind: 'straight' } },
          { source: 'inspect', target: 'fragment', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'fragment', target: 'compile', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'compile', target: 'layers', routing: { kind: 'orthogonal', cornerRadius: 4 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default InspectOutputFlow;
