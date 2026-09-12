import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 展示不同几何输入如何汇入候选点集，再计算边界 */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()}>
    <FlowLayout kind="linear" id="bounds" direction="right" align="center" gap={32}>
      <FlowEntities items={[{ id: 'input', text: '几何输入', role: 'participant' }]} />
      <FlowLayout kind="linear" id="geometry-types" direction="down" align="center" gap={32}>
        <FlowEntities
          items={[
            { id: 'point', text: '常规点', role: 'participant', group: 'point' },
            { id: 'curve', text: '曲线', role: 'participant', group: 'curve' },
            { id: 'shape', text: '基本图形', role: 'participant', group: 'shape' },
          ]}
        />
      </FlowLayout>
      <FlowLayout kind="linear" id="candidate-geometry" direction="down" align="center" gap={32}>
        <FlowEntities
          items={[
            { id: 'direct', text: '直接纳入', role: 'activity', group: 'point' },
            { id: 'extrema', text: '端点与轴向极值', role: 'activity', group: 'curve' },
            { id: 'derive', text: '派生边界候选点', role: 'activity', group: 'shape' },
          ]}
        />
      </FlowLayout>
      <FlowLayout kind="linear" id="reduction" direction="right" align="center" gap={32}>
        <FlowEntities items={[{ id: 'candidates', text: '候选点集', role: 'activity' }]} />
        <FlowEntities items={[{ id: 'calculate-bounds', text: '计算边界', role: 'activity' }]} />
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
