import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

/** Shows the composition and application order of a two-dimensional affine matrix */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
    <FlowLayout id="affine" direction="right" align="center">
      <FlowLayout id="composition" direction="right" align="center">
        <FlowLayout id="matrix-inputs" direction="down" align="center">
          <FlowEntities
            items={[
              { id: 'inner', text: 'Inner matrix (first)', role: 'activity', kind: 'docs.logic.important' },
              { id: 'outer', text: 'Outer matrix (second)', role: 'activity', kind: 'docs.logic.important' },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[{ id: 'compose', text: 'Compose matrix', role: 'activity', kind: 'docs.logic.important' }]}
        />
        <FlowEntities
          items={[{ id: 'combined-matrix', text: 'Combined matrix', role: 'activity', kind: 'docs.logic.important' }]}
        />
      </FlowLayout>
      <FlowLayout id="application" direction="down" align="center" gap={32}>
        <FlowEntities items={[{ id: 'point', text: 'Input point', role: 'participant' }]} />
        <FlowEntities items={[{ id: 'apply', text: 'Apply matrix', role: 'activity', kind: 'docs.logic.important' }]} />
        <FlowEntities items={[{ id: 'result', text: 'Transformed point', role: 'participant' }]} />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'inner', target: 'compose' },
        { source: 'outer', target: 'compose' },
        { source: 'compose', target: 'combined-matrix' },
        { source: 'point', target: 'apply' },
        {
          source: 'combined-matrix',
          target: 'apply',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
        { source: 'apply', target: 'result' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
