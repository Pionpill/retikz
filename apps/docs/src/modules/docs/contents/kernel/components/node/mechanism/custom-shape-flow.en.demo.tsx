import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 形状引用与运行时定义汇合后的编译输出 */
const Demo: FC = () => (
  <PreviewFlowDiagram
    {...logicFigureGraphProps()}
    layout={{ direction: 'right' }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <FlowLayout id="custom-shape" kind="linear" direction="right" align="center">
      <FlowLayout id="inputs" kind="linear" direction="down" align="center">
        <FlowEntities
          items={[
            { id: 'ref', text: 'Shape ref (JSON)', role: 'resource', kind: 'docs.logic.importantData' },
            { id: 'definition', text: 'ShapeDefinition', role: 'concept', kind: 'docs.logic.important' },
          ]}
        />
      </FlowLayout>
      <FlowEntities items={[{ id: 'compile', text: 'Registry + compile', role: 'activity' }]} />
      <FlowLayout id="outputs" kind="linear" direction="down" align="center">
        <FlowEntities
          items={[
            { id: 'scene', text: 'Scene primitives', role: 'resource', kind: 'docs.logic.importantData' },
            { id: 'geometry', text: 'Boundary + anchors', role: 'concept', kind: 'docs.logic.important' },
          ]}
        />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'ref', target: 'compile' },
        { source: 'definition', target: 'compile' },
        { source: 'compile', target: 'scene' },
        { source: 'compile', target: 'geometry' },
      ]}
    />
  </PreviewFlowDiagram>
);

export default Demo;
