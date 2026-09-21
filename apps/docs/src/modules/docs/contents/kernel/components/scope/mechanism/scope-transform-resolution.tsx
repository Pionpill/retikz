import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeFlowDefaults, scopeFlowText } from './scope-flow';
import { scopeTransformResolutionI18n } from './scope-transform-resolution.i18n';

/** 变换与定位流程的语言 */
export type ScopeTransformResolutionProps = Readonly<{ lang?: Lang }>;

/** 区分可选的中心来源与必然先后的两个变换步骤 */
const ScopeTransformResolution: FC<ScopeTransformResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const t = scopeTransformResolutionI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={scopeFlowDefaults}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="transform-stages" kind="linear" direction="right" gap={64} align="start">
        <FlowGroup id="pivot-sources" caption={{ title: { text: t.stages[0] } }}>
          <FlowLayout id="pivot-options" kind="linear" direction="down" gap={36} itemWidth="match-largest">
            <FlowEntities
              items={(['known', 'bounds'] as const).map(id => ({
                id,
                role: 'activity',
                text: scopeFlowText(t.nodes[id]),
              }))}
            />
          </FlowLayout>
        </FlowGroup>
        <FlowGroup id="transform-application" caption={{ title: { text: t.stages[1] } }}>
          <FlowLayout id="transform-actions" kind="linear" direction="down" gap={36} itemWidth="match-largest">
            <FlowEntities
              items={[
                { id: 'own', role: 'activity', text: scopeFlowText(t.nodes.own) },
                {
                  id: 'placement',
                  role: 'activity',
                  kind: LogicFigureEntityKind.Important,
                  text: scopeFlowText(t.nodes.placement),
                },
              ]}
            />
          </FlowLayout>
        </FlowGroup>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'known', target: 'own' },
          { source: 'bounds', target: 'own' },
          { source: 'own', target: 'placement' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ScopeTransformResolution;
