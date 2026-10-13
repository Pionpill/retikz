import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutImplementationI18n } from './layout-implementation.i18n';

/** 布局实现流程的语言 */
export type LayoutImplementationProps = { lang?: Lang };

/** 布局结果由绘制与引用分别消费 */
const LayoutImplementation: FC<LayoutImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = layoutImplementationI18n[lang];
  const stages = ['content', 'shape', 'labels', 'layout'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="implementation"
        kind="grid"
        gap={{ row: 22, column: 36 }}
        placements={[
          ['content', null],
          ['shape', null],
          ['labels', null],
          ['layout', 'emit'],
          [null, 'reference'],
        ]}
      >
        <FlowEntities
          items={([...stages, 'emit', 'reference'] as const).map(id => ({
            id,
            text: text[id]
              .split('\n')
              .map((line, i) => ({ text: line, ...(i === 0 ? {} : { font: { size: 12 }, fill: 'gray' }) })),
            role: id === 'layout' ? 'state' : 'activity',
            layout: { width: 280 },
            ...(id === 'layout' ? { kind: 'docs.logic.importantData' } : {}),
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...stages.slice(1).map((id, i) => ({ source: stages[i], target: id })),
          { source: 'layout', target: 'emit' },
          { source: 'layout', target: 'reference', routing: { kind: '|-' } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default LayoutImplementation;
