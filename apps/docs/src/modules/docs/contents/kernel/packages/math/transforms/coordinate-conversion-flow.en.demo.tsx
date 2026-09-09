import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

/** Shows bidirectional local and world coordinate conversion around a CenteredShape */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
    <FlowLayout id="conversion" direction="right" align="center">
      <FlowEntities items={[{ id: 'local-point', text: 'Local point', role: 'participant' }]} />
      <FlowLayout id="left-steps" direction="down" align="center">
        <FlowEntities
          items={[
            {
              id: 'rotate',
              text: 'Rotate by angle',
              role: 'activity',
              group: 'local-to-world',
            },
            {
              id: 'inverse-rotate',
              text: 'Rotate by negative angle',
              role: 'activity',
              group: 'world-to-local',
            },
          ]}
        />
      </FlowLayout>
      <FlowEntities
        items={[
          {
            id: 'centered-shape',
            text: 'CenteredShape',
            role: 'resource',
          },
        ]}
      />
      <FlowLayout id="right-steps" direction="down" align="center">
        <FlowEntities
          items={[
            {
              id: 'translate',
              text: 'Add center',
              role: 'activity',
              group: 'local-to-world',
            },
            {
              id: 'remove-center',
              text: 'Subtract center',
              role: 'activity',
              group: 'world-to-local',
            },
          ]}
        />
      </FlowLayout>
      <FlowEntities items={[{ id: 'world-point', text: 'World point', role: 'participant' }]} />
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'local-point', target: 'rotate', group: 'local-to-world' },
        { source: 'rotate', target: 'translate', group: 'local-to-world' },
        { source: 'translate', target: 'world-point', group: 'local-to-world' },
        { source: 'world-point', target: 'remove-center', group: 'world-to-local' },
        { source: 'remove-center', target: 'inverse-rotate', group: 'world-to-local' },
        { source: 'inverse-rotate', target: 'local-point', group: 'world-to-local' },
        {
          source: 'centered-shape',
          target: 'rotate',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
        {
          source: 'centered-shape',
          target: 'translate',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
        {
          source: 'centered-shape',
          target: 'remove-center',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
        {
          source: 'centered-shape',
          target: 'inverse-rotate',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
