import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** Shows the bisection search that recovers a curve parameter from distance */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
    <FlowLayout id="distance-search" direction="right" align="center">
      <FlowLayout id="search-state" direction="down" align="center">
        <FlowEntities
          items={[
            {
              id: 'range',
              text: 'Target d\nRange [lo, hi]',
              role: 'state',
              kind: 'docs.logic.importantData',
            },
          ]}
        />
        <FlowEntities
          items={[{ id: 'midpoint', text: 'Midpoint t', role: 'activity', kind: 'docs.logic.algorithm' }]}
        />
      </FlowLayout>
      <FlowEntities items={[{ id: 'length', text: 'Measure L(t)', role: 'activity', kind: 'docs.logic.algorithm' }]} />
      <FlowEntities items={[{ id: 'compare', text: 'L(t) ≈ d?', role: 'gateway' }]} />
      <FlowEntities items={[{ id: 'result', text: 'Parameter t', role: 'state', kind: 'docs.logic.importantData' }]} />
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'range', target: 'midpoint' },
        { source: 'midpoint', target: 'length' },
        { source: 'length', target: 'compare' },
        { source: 'compare', target: 'range' },
        { source: 'compare', target: 'result', label: 'yes' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
