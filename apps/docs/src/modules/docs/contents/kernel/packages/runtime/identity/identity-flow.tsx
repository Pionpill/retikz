import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { identityFlowI18n } from './identity-flow.i18n';

/** 身份流程图的语言配置 */
export type IdentityFlowProps = Readonly<{ lang?: Lang }>;

/** 身份创建、直接比较与集合查找的两条路径 */
const IdentityFlow: FC<IdentityFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = identityFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="identity-flow" kind="linear" direction="right" align="center">
        <FlowLayout id="inputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'create', text: text.create, role: 'activity' },
              { id: 'collect', text: text.collect, role: 'activity' },
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
          { source: 'create', target: 'compare', label: text.pair },
          { source: 'create', target: 'lookup', label: text.list },
          { source: 'collect', target: 'lookup', label: text.internal },
          { source: 'compare', target: 'equal' },
          { source: 'lookup', target: 'query' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default IdentityFlow;
