import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeOverviewI18n } from './scope-overview.i18n';

/** 继承、主题、包络与分组配置流程图的语言 */
export type ScopeOverviewProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const ScopeOverview: FC<ScopeOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = scopeOverviewI18n[lang];
  const stages = [
    { id: 'resolve', name: 'CanonicalScope', state: true },
    { id: 'children', name: 'Reconciler · children', state: false },
    { id: 'compile', name: 'compileScope → CompiledScope', state: false },
    { id: 'output', name: 'GroupPrimitive', state: true },
  ] as const;
  const inputs = [{ id: 'parent', name: 'ScopeCompileContext', target: 'compile' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="scope-overview"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'resolve'],
          [null, 'children'],
          ['parent', 'compile'],
          [null, 'output'],
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
          ...stages.slice(1).map((item, index) => ({
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
export default ScopeOverview;
