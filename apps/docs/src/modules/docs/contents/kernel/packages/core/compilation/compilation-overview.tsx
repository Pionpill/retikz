import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compilationOverviewI18n } from './compilation-overview.i18n';

/** 编译总览图的语言 */
export type CompilationOverviewProps = { lang?: Lang };

/** 从输入到返回结果展示一次完整编译 */
const CompilationOverview: FC<CompilationOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = compilationOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="overview" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="first" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'input', text: text.input, role: 'state' },
              { id: 'context', text: text.context, role: 'activity' },
              { id: 'visit', text: text.visit, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="second" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'pending', text: text.pending, role: 'activity', kind: 'docs.logic.important' },
              { id: 'assemble', text: text.assemble, role: 'activity' },
              { id: 'output', text: text.output, role: 'state' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'context' },
          { source: 'context', target: 'visit' },
          { source: 'visit', target: 'pending', routing: { kind: 'orthogonal' } },
          { source: 'pending', target: 'assemble' },
          { source: 'assemble', target: 'output' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompilationOverview;
