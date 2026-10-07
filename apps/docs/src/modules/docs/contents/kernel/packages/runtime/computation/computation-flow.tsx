import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { computationFlowI18n } from './computation-flow.i18n';

/** 计算流程图的语言配置 */
export type ComputationFlowProps = Readonly<{ lang?: Lang }>;

/** 计算定义、执行与公开结果的完整流程 */
const ComputationFlow: FC<ComputationFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = computationFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="computation-flow" kind="linear" direction="right" align="center">
        <FlowLayout id="inputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'create', text: text.create, role: 'activity' },
              { id: 'collect', text: text.collect, role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="operations" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'compare', text: text.compare, role: 'activity' },
              { id: 'lookup', text: text.lookup, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="results" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'equal', text: text.equal, role: 'state' },
              { id: 'query', text: text.query, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'create', target: 'compare' },
          { source: 'collect', target: 'compare' },
          { source: 'compare', target: 'lookup' },
          { source: 'lookup', target: 'equal' },
          { source: 'equal', target: 'query' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ComputationFlow;
