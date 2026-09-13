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
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="linear" id="flow" direction="down" align="center" gap={48}>
        <FlowLayout kind="linear" id="observations" direction="right" align="center">
          <FlowLayout kind="linear" id="occurrences" direction="down" align="center" gap={16}>
            <FlowEntities
              items={[
                {
                  id: 'occurrence-1',
                  text: i18n.occurrence1,
                  role: 'activity',
                  kind: LogicFigureEntityKind.Secondary,
                },
                {
                  id: 'occurrence-n',
                  text: i18n.occurrence2,
                  role: 'activity',
                  kind: LogicFigureEntityKind.Secondary,
                },
              ]}
            />
          </FlowLayout>
          <FlowLayout kind="linear" id="request-site-and-observe" direction="right" align="center">
            <FlowLayout
              kind="linear"
              id="request"
              direction="down"
              align="center"
              gap={24}
              excludeFromBounds={['admit']}
            >
              <FlowEntities
                items={[
                  {
                    id: 'admit',
                    text: i18n.admit,
                    role: 'activity',
                    kind: LogicFigureEntityKind.Secondary,
                  },
                  {
                    id: 'request-site',
                    text: i18n.requestSite,
                    role: 'activity',
                    kind: LogicFigureEntityKind.Secondary,
                  },
                ]}
              />
            </FlowLayout>
            <FlowEntities
              items={[{ id: 'observe', text: i18n.observe, role: 'activity', kind: LogicFigureEntityKind.Important }]}
            />
          </FlowLayout>
        </FlowLayout>
        <FlowLayout kind="linear" id="completion" direction="right" align="center">
          <FlowEntities
            items={[
              { id: 'captured', text: i18n.captured, role: 'resource', kind: LogicFigureEntityKind.ImportantData },
              { id: 'complete', text: i18n.complete, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'callback', text: i18n.callback, role: 'activity', kind: LogicFigureEntityKind.Important },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="delivery" direction="right" align="center">
          <FlowEntities
            items={[
              { id: 'fragment', text: i18n.fragment, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'plane', text: i18n.inspectionPlane, role: 'resource', kind: LogicFigureEntityKind.ImportantData },
              { id: 'layers', text: i18n.layers, role: 'activity', kind: LogicFigureEntityKind.Secondary },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'admit', target: 'request-site' },
          { source: 'occurrence-1', target: 'request-site' },
          { source: 'occurrence-n', target: 'request-site' },
          { source: 'request-site', target: 'observe' },
          { source: 'observe', target: 'captured', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'captured', target: 'complete' },
          { source: 'complete', target: 'callback', label: i18n.resolveLabel },
          { source: 'callback', target: 'fragment', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'fragment', target: 'plane' },
          { source: 'plane', target: 'layers' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default InspectObserverBatchFlow;
