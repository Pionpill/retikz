import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeImplementationI18n } from './scope-implementation.i18n';

/** 确定继承与局部配置流程图的语言 */
export type ScopeImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const ScopeImplementation: FC<ScopeImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = scopeImplementationI18n[lang];
  const stages = [
    { id: 'inherit', name: 'resolveScope', state: false },
    { id: 'prepare', name: 'prepareScopePlacement', state: false },
    { id: 'visit', name: 'visitScope → compileChildren', state: false },
    { id: 'layout', name: 'compileScope', state: false },
    { id: 'publish', name: 'project → flush → emitScopeGroup', state: true },
  ] as const;
  const inputs = [{ id: 'layouts', name: 'Child geometries', target: 'layout' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="scope-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'inherit'],
          [null, 'prepare'],
          [null, 'visit'],
          ['layouts', 'layout'],
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
export default ScopeImplementation;
