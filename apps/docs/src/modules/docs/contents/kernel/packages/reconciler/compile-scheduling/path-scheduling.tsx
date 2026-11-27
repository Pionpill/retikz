import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pathSchedulingI18n } from './path-scheduling.i18n';

/** 调度图的显示语言 */
export type PathSchedulingProps = { lang?: Lang };

/** 展示路径占位、几何登记与回填的顺序 */
const PathScheduling: FC<PathSchedulingProps> = props => {
  const { lang = 'zh' } = props;
  const labels = pathSchedulingI18n[lang];
  const order = ['visit', 'queue', 'nodes', 'lookup', 'fill', 'scene'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="path-scheduling"
        kind="grid"
        gap={{ row: 24, column: 32 }}
        placements={[
          ['visit', 'queue'],
          ['lookup', 'nodes'],
          ['fill', 'scene'],
        ]}
      >
        <FlowEntities
          items={order.map(id => {
            const member = { queue: 'queuePathChild', nodes: 'assembleNode', fill: 'assemblePaths' } as const;
            if (id === 'queue' || id === 'nodes' || id === 'fill') {
              return {
                id,
                role: 'activity',
                kind: 'docs.logic.important',
                layout: { width: 220 },
                text: [{ text: labels[id] }, { text: member[id], font: { size: 12 } }],
              };
            }
            return { id, role: 'activity', layout: { width: 220 }, text: labels[id] };
          })}
        />
      </FlowLayout>
      <FlowRelations
        items={order.slice(1).map((target, i) => ({ source: { id: order[i] }, target: { id: target } }))}
      />
    </PreviewFlowDiagram>
  );
};
export default PathScheduling;
