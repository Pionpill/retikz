import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeFlowDefaults, scopeFlowText } from './scope-flow';
import { scopeNamespaceLookupI18n } from './scope-namespace-lookup.i18n';

/** 名称查找与注册流程的语言 */
export type ScopeNamespaceLookupProps = Readonly<{ lang?: Lang }>;

/** 将查找和注册分区，查找仅在未命中时向外继续 */
const ScopeNamespaceLookup: FC<ScopeNamespaceLookupProps> = props => {
  const { lang = 'zh' } = props;
  const t = scopeNamespaceLookupI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={scopeFlowDefaults}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="namespace-operations" kind="linear" direction="right" align="start">
        <FlowGroup id="lookup" caption={{ title: { text: t.stages[0] } }}>
          <FlowLayout
            id="lookup-paths"
            kind="grid"
            placements={[
              ['current', 'hit'],
              ['outer', 'absent'],
            ]}
            itemWidth="match-largest"
          >
            <FlowEntities
              items={(['current', 'outer', 'hit', 'absent'] as const).map(id => ({
                id,
                role: 'activity',
                text: scopeFlowText(t.nodes[id]),
                ...(id === 'hit' ? { kind: LogicFigureEntityKind.Important } : {}),
              }))}
            />
          </FlowLayout>
        </FlowGroup>
        <FlowGroup id="registration" caption={{ title: { text: t.stages[1] } }}>
          <FlowLayout id="registration-actions" kind="linear" direction="down" itemWidth="match-largest">
            <FlowEntities
              items={(['register', 'replace'] as const).map(id => ({
                id,
                role: 'activity',
                text: scopeFlowText(t.nodes[id]),
              }))}
            />
          </FlowLayout>
        </FlowGroup>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'current', target: 'hit', label: t.edges.hit },
          { source: 'current', target: 'outer', label: t.edges.miss },
          { source: 'outer', target: 'hit', label: t.edges.hit },
          { source: 'outer', target: 'absent', label: t.edges.allMiss },
          { source: 'register', target: 'replace', label: t.edges.exists },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ScopeNamespaceLookup;
