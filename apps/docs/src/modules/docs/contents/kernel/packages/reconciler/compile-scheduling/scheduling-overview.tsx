import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { schedulingOverviewI18n } from './scheduling-overview.i18n';

/** 调度图的显示语言 */
export type SchedulingOverviewProps = { lang?: Lang };

/** 展示完整场景声明到编译快照的执行顺序 */
const SchedulingOverview: FC<SchedulingOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const labels = schedulingOverviewI18n[lang];
  const stages = [
    { id: 'input', member: 'SceneReconciler.mount' },
    { id: 'runtime', member: 'createCompileRuntime' },
    { id: 'tree', member: 'assembleCompileSubtree' },
    { id: 'snapshot', member: 'finalizeSceneCompilation' },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="scheduling-overview"
        kind="grid"
        gap={{ row: 24, column: 32 }}
        placements={[
          ['input', 'runtime'],
          ['snapshot', 'tree'],
        ]}
      >
        <FlowEntities
          items={stages.map(({ id, member }) => ({
            id,
            role: 'activity',
            layout: { width: 220 },
            text: [{ text: labels[id] }, { text: member, font: { size: 12 }, fill: 'gray' }],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={stages.slice(1).map((target, i) => ({ source: { id: stages[i].id }, target: { id: target.id } }))}
      />
    </PreviewFlowDiagram>
  );
};
export default SchedulingOverview;
