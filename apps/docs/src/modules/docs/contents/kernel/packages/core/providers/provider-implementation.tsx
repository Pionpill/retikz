import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { providerImplementationI18n } from './provider-implementation.i18n';

/** 同键检查，按贡献顺序收集参数流程图的语言 */
export type ProviderImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const ProviderImplementation: FC<ProviderImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = providerImplementationI18n[lang];
  const stages = [
    { id: 'index', name: 'buildProviderIndex', state: false },
    { id: 'visit', name: 'collectReachableProviders', state: false },
    { id: 'factory', name: 'makeDefinition', state: false },
    { id: 'append', name: 'appendExplicitDefinitions', state: false },
    { id: 'freeze', name: 'freezeResolvedDefinitions', state: true },
  ] as const;
  const inputs = [{ id: 'adapter', name: 'Vanilla preparation', target: 'index' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="provider-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          ['adapter', 'index'],
          [null, 'visit'],
          [null, 'factory'],
          [null, 'append'],
          [null, 'freeze'],
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
export default ProviderImplementation;
