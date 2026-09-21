import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 多边形的内容外接与轮廓消费流程 */
const Demo: FC = () => (
  <PreviewFlowDiagram
    {...logicFigureGraphProps()}
    layout={{ direction: 'right' }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <FlowLayout
      id="polygon"
      kind="grid"
      placements={[
        ['inner-box', null, 'rounding', null],
        ['shape-params', 'fit', 'contour', 'scene-path'],
        ['diamond', null, null, 'boundary-hit'],
      ]}
    >
      <FlowEntities
        items={[
          { id: 'inner-box', text: '文字 + padding', role: 'resource', kind: 'docs.logic.importantData' },
          { id: 'shape-params', text: 'sides + rotate', role: 'resource', kind: 'docs.logic.importantData' },
          { id: 'diamond', text: 'diamond 预设', role: 'resource', kind: 'docs.logic.importantData' },
          { id: 'fit', text: '计算\n外接半径', role: 'activity' },
          { id: 'rounding', text: 'cornerRadius', role: 'resource', kind: 'docs.logic.importantData' },
          { id: 'contour', text: '圆角轮廓', role: 'resource' },
          { id: 'scene-path', text: 'Scene Path', role: 'concept', kind: 'docs.logic.important' },
          { id: 'boundary-hit', text: '边界交点', role: 'concept', kind: 'docs.logic.important' },
        ]}
      />
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'inner-box', target: 'fit' },
        { source: 'shape-params', target: 'fit' },
        { source: 'diamond', target: 'shape-params', label: '4 / 0' },
        { source: 'fit', target: 'contour', label: '外接' },
        { source: 'rounding', target: 'contour', label: '倒角' },
        { source: 'contour', target: 'scene-path', label: '绘制' },
        { source: 'contour', target: 'boundary-hit', label: '求交' },
      ]}
    />
  </PreviewFlowDiagram>
);

export default Demo;
