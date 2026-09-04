import type { FC } from 'react';

import { FlowEntity, FlowGroup, FlowLayout, FlowRelation } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

const Demo: FC = () => (
  <FlowDiagram width={430} height="auto" style={{ maxWidth: '100%', height: 'auto' }}>
    <FlowLayout id="columns" direction="right" gap={56} align="start">
      <FlowGroup id="client" label="客户端" layout={{ direction: 'down' }}>
        <FlowEntity id="interaction" text="用户交互" role="event" />
        <FlowEntity id="view" text="React View" role="state" />
      </FlowGroup>
      <FlowGroup id="server" label="服务端">
        <FlowLayout id="application" direction="down" gap={24} align="center">
          <FlowEntity id="api" text="API" role="activity" />
          <FlowEntity id="database" text="Database" role="state" />
        </FlowLayout>
      </FlowGroup>
    </FlowLayout>
    <FlowRelation source="interaction" target="view" />
    <FlowRelation source="view" target="api" label="HTTPS" />
    <FlowRelation source="api" target="database" />
  </FlowDiagram>
);

export default Demo;
