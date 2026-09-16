import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeCompileFlowI18n } from './scope-compile-flow.i18n';

export type ScopeFlowProps = { lang?: Lang };
const Demo: FC<ScopeFlowProps> = props => {
  const { lang = 'zh' } = props;
  const labels = scopeCompileFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="scope-flow" kind="linear" direction="down" gap={22}>
        <FlowEntities items={labels.map((text, index) => ({ id: `stage-${index}`, text, role: 'activity' }))} />
      </FlowLayout>
      <FlowRelations
        items={labels.slice(1).map((_, index) => ({ source: `stage-${index}`, target: `stage-${index + 1}` }))}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;
