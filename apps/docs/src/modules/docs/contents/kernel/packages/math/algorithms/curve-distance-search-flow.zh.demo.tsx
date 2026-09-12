import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 展示如何按目标距离二分反查曲线参数 */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
    <FlowLayout kind="linear" id="distance-search" direction="right" align="center">
      <FlowLayout kind="linear" id="search-state" direction="down" align="center">
        <FlowEntities
          items={[
            {
              id: 'range',
              text: '目标 d\n区间 [lo, hi]',
              role: 'state',
              kind: 'docs.logic.importantData',
            },
          ]}
        />
        <FlowEntities items={[{ id: 'midpoint', text: '取中点 t', role: 'activity', kind: 'docs.logic.algorithm' }]} />
      </FlowLayout>
      <FlowEntities items={[{ id: 'length', text: '估算 L(t)', role: 'activity', kind: 'docs.logic.algorithm' }]} />
      <FlowEntities items={[{ id: 'compare', text: 'L(t) 接近 d？', role: 'gateway' }]} />
      <FlowEntities items={[{ id: 'result', text: '参数 t', role: 'state', kind: 'docs.logic.importantData' }]} />
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'range', target: 'midpoint' },
        { source: 'midpoint', target: 'length' },
        { source: 'length', target: 'compare' },
        { source: 'compare', target: 'range' },
        { source: 'compare', target: 'result', label: '是' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
