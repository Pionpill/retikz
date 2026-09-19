import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeFlowDefaults, scopeFlowText } from './scope-flow';
import { scopeReferenceEnvelopeI18n } from './scope-reference-envelope.i18n';

/** 整体引用流程的语言 */
export type ScopeReferenceEnvelopeProps = Readonly<{ lang?: Lang }>;

/** 主线发布包络，真实身份判断的例外分支向下分离 */
const ScopeReferenceEnvelope: FC<ScopeReferenceEnvelopeProps> = props => {
  const { lang = 'zh' } = props;
  const t = scopeReferenceEnvelopeI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{
        ...scopeFlowDefaults,
        entity: { style: { font: { size: 14 } }, layout: { lineHeight: 16 } },
      }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout
        id="reference-paths"
        kind="grid"
        placements={[
          ['layouts', 'envelope', 'resolved'],
          ['placeholder', 'check', 'preserve'],
        ]}
        rowGap={32}
        columnGap={42}
      >
        <FlowEntities
          items={[
            { id: 'layouts', role: 'activity', text: scopeFlowText(t.nodes.layouts) },
            { id: 'placeholder', role: 'activity', text: scopeFlowText(t.nodes.placeholder) },
            { id: 'envelope', role: 'activity', text: scopeFlowText(t.nodes.envelope) },
            {
              id: 'check',
              role: 'gateway',
              text: t.nodes.check[0],
              layout: { minimumSize: { width: 0, height: 0 } },
            },
            {
              id: 'resolved',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
              text: scopeFlowText(t.nodes.resolved),
            },
            { id: 'preserve', role: 'activity', text: scopeFlowText(t.nodes.preserve) },
          ]}
        />
      </FlowLayout>

      <FlowRelations
        items={[
          { source: 'layouts', target: 'envelope' },
          { source: 'envelope', target: 'resolved' },
          { source: 'placeholder', target: 'check' },
          { source: 'check', target: 'resolved', label: t.edges.no },
          { source: 'check', target: 'preserve', label: t.edges.yes },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ScopeReferenceEnvelope;
