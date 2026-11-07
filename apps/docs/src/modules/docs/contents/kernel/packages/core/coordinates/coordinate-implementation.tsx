import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { coordinateImplementationI18n } from './coordinate-implementation.i18n';

/** 确定默认距离与嵌套表达流程图的语言 */
export type CoordinateImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const CoordinateImplementation: FC<CoordinateImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = coordinateImplementationI18n[lang];
  const stages = [
    { id: 'resolve', name: 'resolveCoordinate / resolvePosition', state: false },
    { id: 'context', name: 'createTreePositionContext', state: false },
    { id: 'compile', name: 'compileCoordinate → evaluatePosition', state: false },
    { id: 'publish', name: 'visitCoordinate', state: true },
  ] as const;
  const inputs = [{ id: 'names', name: 'NamespaceStack', target: 'context' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="coordinate-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'resolve'],
          ['names', 'context'],
          [null, 'compile'],
          [null, 'publish'],
        ]}
      >
        <FlowEntities
          items={stages.map(item => ({
            id: item.id,
            role: item.state ? 'state' : 'activity',
            layout: { width: 290 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
        <FlowEntities
          items={inputs.map(item => ({
            id: item.id,
            role: 'state',
            kind: 'docs.logic.secondary',
            layout: { width: 230 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
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
          ...inputs.map(item => ({
            source: { id: item.id, anchor: 'right' as const },
            target: { id: item.target, anchor: 'left' as const },
          })),
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CoordinateImplementation;
