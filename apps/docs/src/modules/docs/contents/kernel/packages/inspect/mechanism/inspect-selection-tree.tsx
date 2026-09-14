import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { inspectSelectionTreeI18n } from './inspect-selection-tree.i18n';

export type InspectSelectionTreeProps = Readonly<{ lang?: Lang }>;

export const InspectSelectionTree: FC<InspectSelectionTreeProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = inspectSelectionTreeI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down' }}>
      <FlowLayout
        kind="grid"
        id="tree"
        rowGap={40}
        columnGap={24}
        placements={[
          [null, 'scene', null],
          ['inherit', 'disable', 'barrier'],
          ['inherited', 'reopened', 'blocked'],
        ]}
      >
        <FlowEntities
          items={[{ id: 'scene', text: i18n.scene, role: 'activity', kind: LogicFigureEntityKind.Important }]}
        />
        <FlowEntities
          items={[
            { id: 'inherit', text: i18n.inherit, role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'inherited', text: i18n.inherited, role: 'activity', kind: LogicFigureEntityKind.Important },
          ]}
        />
        <FlowEntities
          items={[
            {
              id: 'disable',
              text: i18n.disable,
              role: 'activity',
              status: 'disabled',
            },
            { id: 'reopened', text: i18n.reopened, role: 'activity', kind: LogicFigureEntityKind.Important },
          ]}
        />
        <FlowEntities
          items={[
            {
              id: 'barrier',
              text: i18n.barrier,
              role: 'activity',
              status: 'disabled',
            },
            {
              id: 'blocked',
              text: i18n.blocked,
              role: 'activity',
              status: 'disabled',
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          {
            source: 'scene',
            target: 'inherit',
            role: 'association',
            direction: 'none',
            routing: { kind: 'orthogonal', cornerRadius: 4 },
          },
          {
            source: 'scene',
            target: 'disable',
            role: 'association',
            direction: 'none',
            routing: { kind: 'orthogonal', cornerRadius: 4 },
          },
          {
            source: 'scene',
            target: 'barrier',
            role: 'association',
            direction: 'none',
            routing: { kind: 'orthogonal', cornerRadius: 4 },
          },
          { source: 'inherit', target: 'inherited', role: 'association', direction: 'none' },
          { source: 'disable', target: 'reopened', role: 'association', direction: 'none' },
          { source: 'barrier', target: 'blocked', role: 'association', direction: 'none' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default InspectSelectionTree;
