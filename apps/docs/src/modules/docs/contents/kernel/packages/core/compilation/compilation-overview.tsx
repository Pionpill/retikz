import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compilationOverviewI18n } from './compilation-overview.i18n';

/** 声明、测量服务与有效配置流程图的语言 */
export type CompilationOverviewProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const CompilationOverview: FC<CompilationOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = compilationOverviewI18n[lang];
  const stages = [
    { id: 'input', name: 'IRScene + definitions', state: true },
    { id: 'visit', name: 'Reconciler · subtree', state: false },
    { id: 'paths', name: 'References ready → paths', state: false },
    { id: 'scene', name: 'Scene + artifacts', state: true },
  ] as const;
  const inputs = [{ id: 'core', name: 'Core', target: 'visit' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="compilation-overview"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'input'],
          ['core', 'visit'],
          [null, 'paths'],
          [null, 'scene'],
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
export default CompilationOverview;
