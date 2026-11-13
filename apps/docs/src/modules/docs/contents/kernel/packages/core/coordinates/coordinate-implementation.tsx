import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { coordinateImplementationI18n } from './coordinate-implementation.i18n';

/** 坐标阶段图的语言 */
export type CoordinateImplementationProps = { lang?: Lang };

/** 展示位置表达的阶段产物与上下文输入 */
const CoordinateImplementation: FC<CoordinateImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = coordinateImplementationI18n[lang];
  const stages = [
    { id: 'canon', name: 'CanonicalCoordinate', state: true },
    { id: 'evaluate', name: 'evaluatePosition', state: false },
    { id: 'points', name: 'PositionEvaluation', state: true },
    { id: 'compiled', name: 'CompiledCoordinate', state: true },
    { id: 'publish', name: 'visitCoordinate', state: false },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="coordinate-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'canon'],
          ['context', 'evaluate'],
          [null, 'points'],
          [null, 'compiled'],
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
          ...stages
            .slice(1)
            .map((item, index) => ({
              source: { id: stages[index].id, anchor: 'bottom' as const },
              target: { id: item.id, anchor: 'top' as const },
            })),
          { source: { id: 'context', anchor: 'right' }, target: { id: 'evaluate', anchor: 'left' } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CoordinateImplementation;
