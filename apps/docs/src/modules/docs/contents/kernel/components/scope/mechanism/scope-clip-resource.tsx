import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeClipResourceI18n } from './scope-clip-resource.i18n';
import { scopeFlowDefaults, scopeFlowText } from './scope-flow';

/** 裁剪流程图的语言 */
export type ScopeClipResourceProps = Readonly<{ lang?: Lang }>;

/** 用两个对齐的阶段区分几何生成和资源输出 */
const ScopeClipResource: FC<ScopeClipResourceProps> = props => {
  const { lang = 'zh' } = props;
  const t = scopeClipResourceI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={scopeFlowDefaults}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="clip-stages" kind="linear" direction="right" gap={58} align="start">
        <FlowGroup id="clip-geometry" caption={{ title: { text: t.stages[0] } }}>
          <FlowLayout id="clip-generation" kind="linear" direction="down" gap={36} itemWidth="match-largest">
            <FlowEntities
              items={(['resolve', 'lower'] as const).map(id => ({
                id,
                role: 'activity',
                text: scopeFlowText(t.nodes[id]),
              }))}
            />
          </FlowLayout>
        </FlowGroup>
        <FlowGroup id="clip-output" caption={{ title: { text: t.stages[1] } }}>
          <FlowLayout id="clip-assembly" kind="linear" direction="down" gap={36} itemWidth="match-largest">
            <FlowEntities
              items={[
                { id: 'store', role: 'activity', text: scopeFlowText(t.nodes.store) },
                {
                  id: 'assemble',
                  role: 'activity',
                  kind: LogicFigureEntityKind.Important,
                  text: scopeFlowText(t.nodes.assemble),
                },
              ]}
            />
          </FlowLayout>
        </FlowGroup>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'resolve', target: 'lower' },
          { source: 'lower', target: 'store', routing: { kind: 'orthogonal' } },
          { source: 'store', target: 'assemble' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ScopeClipResource;
