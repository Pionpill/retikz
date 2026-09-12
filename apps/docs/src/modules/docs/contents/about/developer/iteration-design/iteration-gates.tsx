import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { iterationGatesI18n } from './iteration-gates.i18n';

export type IterationGatesFigureProps = Readonly<{ lang?: Lang }>;

export const IterationGatesFigure: FC<IterationGatesFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = iterationGatesI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down', nodeGap: 20 }}>
      <FlowLayout kind="linear" id="iteration" direction="down" align="center" gap={48}>
        <FlowLayout kind="linear" id="design" direction="right" align="center" gap={28}>
          <FlowEntities
            items={[
              { id: 'adr', text: i18n.adr, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              {
                id: 'architecture-gate',
                text: i18n.architectureGate,
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
              },
              {
                id: 'confirm-adr',
                text: i18n.confirmAdr,
                role: 'activity',
                kind: LogicFigureEntityKind.Secondary,
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="planning" direction="right" align="center" gap={28}>
          <FlowEntities
            items={[
              { id: 'plan', text: i18n.plan, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              {
                id: 'plan-gate',
                text: i18n.planGate,
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
              },
              {
                id: 'implementation',
                text: i18n.implementation,
                role: 'activity',
                kind: LogicFigureEntityKind.Secondary,
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'adr', target: 'architecture-gate' },
          { source: 'architecture-gate', target: 'confirm-adr' },
          { source: 'confirm-adr', target: 'plan', routing: { kind: 'orthogonal' } },
          { source: 'plan', target: 'plan-gate' },
          { source: 'plan-gate', target: 'implementation' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default IterationGatesFigure;
