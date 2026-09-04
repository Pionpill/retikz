import type { FC } from 'react';

import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

const Demo: FC = () => (
  <FlowDiagram
    width={394.84}
    height="auto"
    style={{ maxWidth: '100%', height: 'auto' }}
    flowThemeTokens={{ 'flow.layout.rankGap': 64, 'flow.entity.stroke': 'gray' }}
    flowTheme={{ entity: { style: { stroke: 'currentColor', fillOpacity: 0.12 } } }}
  >
    <FlowEntity id="draft" text="Draft" role="state" />
    <FlowEntity
      id="review"
      text="Human review"
      role="activity"
      style={{ color: 'darkorange', fill: 0.2, stroke: 'currentColor' }}
    />
    <FlowEntity id="publish" text="Publish" role="event" />
    <FlowRelation source="draft" target="review" />
    <FlowRelation source="review" target="publish" />
  </FlowDiagram>
);

export default Demo;
