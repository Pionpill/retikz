import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 矩形 Node 从内容内框到可连接边界的布局流程图 */
const Demo: FC = () => (
  <PreviewFlowDiagram
    {...logicFigureGraphProps()}
    layout={{ direction: 'right' }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <FlowLayout id="rectangle" kind="linear" direction="right" align="center">
      <FlowLayout id="inputs" kind="linear" direction="down" align="center">
        <FlowEntities
          items={[
            { id: 'text-size', text: 'text measurement', role: 'resource', kind: 'docs.logic.importantData' },
            { id: 'padding', text: 'padding', role: 'resource', kind: 'docs.logic.importantData' },
          ]}
        />
      </FlowLayout>
      <FlowEntities
        items={[
          { id: 'inner-box', text: 'inner content box', role: 'resource' },
          { id: 'rectangle-shape', text: 'rectangle shape\n+ cornerRadius', role: 'activity' },
        ]}
      />
      <FlowLayout id="outputs" kind="linear" direction="down" align="center">
        <FlowEntities
          items={[
            { id: 'visible-outline', text: 'visible rectangle', role: 'concept', kind: 'docs.logic.important' },
            {
              id: 'connection-geometry',
              text: 'directional anchors\nboundary intersection',
              role: 'concept',
              kind: 'docs.logic.important',
            },
          ]}
        />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'text-size', target: 'inner-box' },
        { source: 'padding', target: 'inner-box' },
        { source: 'inner-box', target: 'rectangle-shape' },
        { source: 'rectangle-shape', target: 'visible-outline', label: 'emit' },
        { source: 'rectangle-shape', target: 'connection-geometry', label: 'resolve' },
      ]}
    />
  </PreviewFlowDiagram>
);

export default Demo;
