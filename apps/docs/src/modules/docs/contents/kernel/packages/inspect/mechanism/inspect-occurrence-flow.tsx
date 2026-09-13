import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { inspectOccurrenceFlowI18n } from './inspect-occurrence-flow.i18n';
export type InspectOccurrenceFlowProps = Readonly<{ lang?: Lang }>;
const InspectOccurrenceFlow: FC<InspectOccurrenceFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = inspectOccurrenceFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="linear" id="all" direction="down" gap={48} align="center">
        <FlowLayout kind="linear" id="row0" direction="right" gap={32} align="center">
          <FlowEntities
            items={[
              { id: 'source', text: i18n.source, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              { id: 'admit', text: i18n.admit, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              { id: 'compile', text: i18n.compile, role: 'activity', kind: LogicFigureEntityKind.Secondary },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="row1" direction="right" gap={32} align="center">
          <FlowEntities
            items={[
              { id: 'instances', text: i18n.instances, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              { id: 'match', text: i18n.match, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              { id: 'selected', text: i18n.selected, role: 'activity', kind: LogicFigureEntityKind.Secondary },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'source', target: 'admit', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'admit', target: 'compile', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'compile', target: 'instances', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'instances', target: 'match', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'match', target: 'selected', routing: { kind: 'orthogonal', cornerRadius: 4 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default InspectOccurrenceFlow;
