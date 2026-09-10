import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** Shows how different geometry inputs join candidate points before bounds calculation */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()}>
    <FlowLayout id="bounds" direction="right" align="center" gap={32}>
      <FlowEntities items={[{ id: 'input', text: 'Geometry input', role: 'participant' }]} />
      <FlowLayout id="geometry-types" direction="down" align="center" gap={32}>
        <FlowEntities
          items={[
            { id: 'point', text: 'Point', role: 'participant', group: 'point' },
            { id: 'curve', text: 'Curve', role: 'participant', group: 'curve' },
            { id: 'shape', text: 'Basic shape', role: 'participant', group: 'shape' },
          ]}
        />
      </FlowLayout>
      <FlowLayout id="candidate-geometry" direction="down" align="center" gap={32}>
        <FlowEntities
          items={[
            { id: 'direct', text: 'Use directly', role: 'activity', group: 'point' },
            { id: 'extrema', text: 'Endpoints and axis extrema', role: 'activity', group: 'curve' },
            { id: 'derive', text: 'Derive boundary candidates', role: 'activity', group: 'shape' },
          ]}
        />
      </FlowLayout>
      <FlowLayout id="reduction" direction="right" align="center" gap={32}>
        <FlowEntities items={[{ id: 'candidates', text: 'Candidate points', role: 'activity' }]} />
        <FlowEntities items={[{ id: 'calculate-bounds', text: 'Compute bounds', role: 'activity' }]} />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'input', target: 'point', group: 'point' },
        { source: 'point', target: 'direct', group: 'point' },
        { source: 'input', target: 'curve', group: 'curve' },
        { source: 'curve', target: 'extrema', group: 'curve' },
        { source: 'input', target: 'shape', group: 'shape' },
        { source: 'shape', target: 'derive', group: 'shape' },
        { source: 'direct', target: 'candidates', group: 'point' },
        { source: 'extrema', target: 'candidates', group: 'curve' },
        { source: 'derive', target: 'candidates', group: 'shape' },
        { source: 'candidates', target: 'calculate-bounds' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
