import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { providerOverviewI18n } from './provider-overview.i18n';

/** 根需求 + 显式 provider 目录流程图的语言 */
export type ProviderOverviewProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const ProviderOverview: FC<ProviderOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = providerOverviewI18n[lang];
  const stages = [
    { id: 'catalog', name: 'Contribution', state: true },
    { id: 'closure', name: 'Reachable closure', state: false },
    { id: 'make', name: 'makeDefinition(params)', state: false },
    { id: 'defs', name: 'CoreProviderDefinitions', state: true },
  ] as const;
  const inputs = [{ id: 'explicit', name: 'definitions', target: 'defs' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="provider-overview"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'catalog'],
          [null, 'closure'],
          [null, 'make'],
          ['explicit', 'defs'],
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
export default ProviderOverview;
