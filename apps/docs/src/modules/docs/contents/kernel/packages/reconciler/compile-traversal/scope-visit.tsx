import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeVisitI18n } from './scope-visit.i18n';

/** 一次完整 Scope 访问中的调用顺序 */
const ScopeVisit: FC<{ lang?: Lang }> = ({ lang = 'zh' }) => {
  const steps = ['prepareScopeExecution', 'children', 'compileScope', 'project', 'paths', 'dispose → publish'] as const;
  const ids = ['enter', 'visit', 'layout', 'project', 'paths', 'exit'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="scope-visit"
        kind="grid"
        gap={{ row: 24, column: 32 }}
        placements={[
          ['enter', 'visit'],
          ['project', 'layout'],
          ['paths', 'exit'],
        ]}
      >
        <FlowEntities
          items={ids.map((id, i) => ({
            id,
            role: 'activity',
            layout: { width: 210 },
            text: [{ text: scopeVisitI18n[lang][i] }, { text: steps[i], font: { size: 12 }, fill: 'gray' }],
          }))}
        />
      </FlowLayout>
      <FlowRelations items={ids.slice(1).map((target, i) => ({ source: { id: ids[i] }, target: { id: target } }))} />
    </PreviewFlowDiagram>
  );
};
export default ScopeVisit;
