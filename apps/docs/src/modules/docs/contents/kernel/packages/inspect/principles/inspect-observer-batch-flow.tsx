import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { inspectObserverBatchFlowI18n } from './inspect-observer-batch-flow.i18n';

export type InspectObserverBatchFlowProps = Readonly<{ lang?: Lang }>;

export const InspectObserverBatchFlow: FC<InspectObserverBatchFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = inspectObserverBatchFlowI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()}>
      <FlowLayout kind="linear" id="flow" direction="down" align="center">
        <FlowLayout kind="linear" id="observations" direction="right" align="center">
          <FlowLayout kind="linear" id="occurrences" direction="down" align="center" gap={16}>
            <FlowEntities
              items={[
                { id: 'occurrence-1', text: i18n.occurrence1, role: 'activity', kind: LogicFigureEntityKind.Secondary },
                { id: 'occurrence-2', text: i18n.occurrence2, role: 'activity', kind: LogicFigureEntityKind.Secondary },
                { id: 'occurrence-3', text: i18n.occurrence3, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              ]}
            />
          </FlowLayout>
          <FlowEntities
            items={[
              { id: 'observe', text: i18n.observe, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'captured', text: i18n.captured, role: 'resource', kind: LogicFigureEntityKind.ImportantData },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="completion" direction="right" align="center">
          <FlowEntities
            items={[
              { id: 'complete', text: i18n.complete, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'plane', text: i18n.inspectionPlane, role: 'activity', kind: LogicFigureEntityKind.Secondary },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'occurrence-1', target: 'observe' },
          { source: 'occurrence-2', target: 'observe' },
          { source: 'occurrence-3', target: 'observe' },
          { source: 'observe', target: 'captured' },
          { source: 'captured', target: 'complete', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'complete', target: 'plane' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default InspectObserverBatchFlow;
