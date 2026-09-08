import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

/** 展示 compositeOpaqueColor 的正常解析与预合成链路 */
const Demo: FC = () => (
  <FlowDiagram>
    <FlowLayout id="rows" direction="down" align="center">
      <FlowLayout id="prepare" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'inputs', text: 'Inputs', role: 'participant' },
            { id: 'weight', text: 'Validate weight 0..1', role: 'activity' },
            { id: 'parse', text: 'Parse static colors', role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowLayout id="compose-row" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'backdrop', text: 'Require opaque backdrop', role: 'activity' },
            { id: 'compose', text: 'Source-over sRGB', role: 'activity' },
            { id: 'output', text: '#rrggbb', role: 'participant' },
          ]}
        />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        ['inputs', 'weight'],
        ['weight', 'parse'],
        { source: 'parse', target: 'backdrop', routing: { kind: 'orthogonal', cornerRadius: 8 } },
        ['backdrop', 'compose'],
        ['compose', 'output'],
      ]}
    />
  </FlowDiagram>
);

export default Demo;
