import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { inspectRoleFlowI18n } from './inspect-role-flow.i18n';
export type InspectRoleFlowProps = Readonly<{ lang?: Lang }>;
const InspectRoleFlow: FC<InspectRoleFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = inspectRoleFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="linear" id="all" direction="down" gap={48} align="center">
        <FlowLayout kind="linear" id="row0" direction="right" gap={32} align="center">
          <FlowEntities
            items={[
              { id: 'selection', text: i18n.selection, role: 'activity' },
              { id: 'lookup', text: i18n.lookup, role: 'activity' },
              { id: 'inspector', text: i18n.inspector, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="row1" direction="right" gap={32} align="center">
          <FlowEntities
            items={[{ id: 'registry', text: i18n.registry, role: 'activity', kind: LogicFigureEntityKind.Secondary }]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'selection', target: 'lookup', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'registry', target: 'lookup', routing: { kind: 'straight' } },
          { source: 'lookup', target: 'inspector', routing: { kind: 'orthogonal', cornerRadius: 4 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default InspectRoleFlow;
