import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutImplementationI18n } from './layout-implementation.i18n';

/** Reconciler 提供继承与注册表流程图的语言 */
export type LayoutImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const LayoutImplementation: FC<LayoutImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = layoutImplementationI18n[lang];
  const stages = [
    { id: 'resolve', name: 'visitNode → resolveNode', state: false },
    { id: 'measure', name: 'compileNode → layoutNode', state: false },
    { id: 'layout', name: 'layoutNode', state: false },
    { id: 'emit', name: 'emitNode', state: false },
    { id: 'publish', name: 'visitNode', state: true },
  ] as const;
  const inputs = [{ id: 'prepared', name: 'PreparedNodeCompilation', target: 'measure' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="layout-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'resolve'],
          ['prepared', 'measure'],
          [null, 'layout'],
          [null, 'emit'],
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
export default LayoutImplementation;
