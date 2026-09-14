import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

/** 对照同一对节点之间的两种单折角顺序 */
const FlowRoutingDemo: FC = () => (
  <PreviewFlowDiagram style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto' }}>
    <FlowLayout
      kind="grid"
      id="grid"
      placements={[
        ['a', null],
        [null, 'b'],
      ]}
    >
      <FlowEntities
        items={[
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ]}
      />
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'a', target: 'b', label: '-|', routing: { kind: '-|', cornerRadius: 0 } },
        { source: 'a', target: 'b', label: '|-', routing: { kind: '|-', cornerRadius: 0 } },
      ]}
    />
  </PreviewFlowDiagram>
);

export default FlowRoutingDemo;
