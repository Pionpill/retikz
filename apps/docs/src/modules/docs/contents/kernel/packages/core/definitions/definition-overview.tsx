import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { definitionOverviewI18n } from './definition-overview.i18n';

/** 声明能力名称与实例参数流程图的语言 */
export type DefinitionOverviewProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const DefinitionOverview: FC<DefinitionOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = definitionOverviewI18n[lang];
  const stages = [
    { id: 'declare', name: 'IR', state: true },
    { id: 'lookup', name: 'registry', state: false },
    { id: 'resolve', name: 'Definition + schema', state: false },
    { id: 'consume', name: 'layout / emit / compile', state: false },
  ] as const;
  const inputs = [{ id: 'definitions', name: 'built-ins + CompileOptions', target: 'lookup' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="definition-overview"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'declare'],
          ['definitions', 'lookup'],
          [null, 'resolve'],
          [null, 'consume'],
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
export default DefinitionOverview;
