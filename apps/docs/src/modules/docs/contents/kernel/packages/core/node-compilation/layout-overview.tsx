import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutOverviewI18n } from './layout-overview.i18n';

/** 有效样式、正文与 Shape / Boundary流程图的语言 */
export type LayoutOverviewProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const LayoutOverview: FC<LayoutOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = layoutOverviewI18n[lang];
  const stages = [
    { id: 'canon', name: 'CanonicalNode', state: true },
    { id: 'measure', name: 'Content → shape → placement', state: false },
    { id: 'emit', name: 'Shape + content + labels', state: false },
    { id: 'compiled', name: 'CompiledNode', state: true },
  ] as const;
  const inputs = [{ id: 'context', name: 'NodeCompileContext', target: 'measure' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="layout-overview"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'canon'],
          ['context', 'measure'],
          [null, 'emit'],
          [null, 'compiled'],
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
export default LayoutOverview;
