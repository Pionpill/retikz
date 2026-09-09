import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  LogicFigureEntityKind,
  LogicFigureRelationKind,
  logicFigureGraphProps,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

/** 展示 compositeOpaqueColor 的正常解析与预合成链路 */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
    <FlowLayout id="rows" direction="down" align="center">
      <FlowLayout id="prepare" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'inputs', text: 'Inputs', role: 'participant' },
            { id: 'weight', text: 'Validate weight 0..1', role: 'activity', kind: LogicFigureEntityKind.Secondary },
            { id: 'parse', text: 'Parse static colors', role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'colors', text: 'Color list', role: 'resource', kind: LogicFigureEntityKind.Secondary },
          ]}
        />
      </FlowLayout>
      <FlowLayout id="compose-row" direction="right" align="center">
        <FlowEntities
          items={[
            {
              id: 'backdrop',
              text: 'Require opaque backdrop',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
            },
            { id: 'compose', text: 'Source-over sRGB', role: 'activity', kind: LogicFigureEntityKind.Algorithm },
            { id: 'output', text: '#rrggbb', role: 'participant' },
          ]}
        />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'inputs', target: 'weight' },
        { source: 'weight', target: 'parse' },
        {
          source: 'colors',
          target: 'parse',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
        {
          source: 'parse',
          target: 'backdrop',
          routing: { kind: 'orthogonal', cornerRadius: 8 },
        },
        { source: 'backdrop', target: 'compose' },
        { source: 'compose', target: 'output' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
