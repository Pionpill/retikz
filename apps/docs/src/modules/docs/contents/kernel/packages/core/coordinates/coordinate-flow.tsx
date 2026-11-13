import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { coordinateFlowI18n } from './coordinate-flow.i18n';

/** 坐标阶段图的语言 */
export type CoordinateFlowProps = { lang?: Lang };

/** 展示位置表达的阶段产物与上下文输入 */
const CoordinateFlow: FC<CoordinateFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = coordinateFlowI18n[lang];
  const stages = [
    { id: 'source', name: 'IRCoordinate', state: true },
    { id: 'resolve', name: 'resolve → CanonicalCoordinate', state: false },
    { id: 'compile', name: 'compile → CompiledCoordinate', state: false },
    { id: 'publish', name: 'Named position', state: true },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="coordinate-flow"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'source'],
          [null, 'resolve'],
          ['context', 'compile'],
          [null, 'publish'],
        ]}
      >
        <FlowEntities
          items={stages.map(item => ({
            id: item.id,
            role: item.state ? 'state' : 'activity',
            layout: { width: 300 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
        <FlowEntities
          items={[
            {
              id: 'context',
              role: 'state',
              kind: 'docs.logic.secondary',
              layout: { width: 260 },
              text: [
                { text: 'PositionEvaluateContext', font: { size: 12 } },
                { text: text.context, font: { size: 12 }, fill: 'gray' },
              ],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...stages.slice(1).map((item, index) => ({
            source: { id: stages[index].id, anchor: 'bottom' as const },
            target: { id: item.id, anchor: 'top' as const },
          })),
          { source: { id: 'context', anchor: 'right' }, target: { id: 'compile', anchor: 'left' } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CoordinateFlow;
