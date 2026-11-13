import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { outputOverviewI18n } from './output-overview.i18n';

/** 局部图元、布局与资源引用流程图的语言 */
export type OutputOverviewProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const OutputOverview: FC<OutputOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = outputOverviewI18n[lang];
  const stages = [
    { id: 'atomic', name: 'Core stage products', state: true },
    { id: 'tree', name: 'Reconciler · subtree collection', state: false },
    { id: 'snapshot', name: 'SceneCompilationSnapshot', state: true },
    { id: 'consumer', name: 'Render / application', state: true },
  ] as const;
  const inputs = [{ id: 'artifact', name: 'Composite artifacts', target: 'tree' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="output-overview"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'atomic'],
          ['artifact', 'tree'],
          [null, 'snapshot'],
          [null, 'consumer'],
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
export default OutputOverview;
