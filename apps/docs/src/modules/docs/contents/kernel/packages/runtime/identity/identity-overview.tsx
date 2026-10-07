import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { identityOverviewI18n } from './identity-overview.i18n';

/** 总览图的语言配置 */
export type IdentityOverviewProps = Readonly<{ lang?: Lang }>;

/** 展示身份创建与集合查询的主线 */
const IdentityOverview: FC<IdentityOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = identityOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="identity-overview" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'identity-overview-create', text: text.create, role: 'activity' },
            { id: 'identity-overview-collect', text: text.collect, role: 'activity' },
            { id: 'identity-overview-lookup', text: text.lookup, role: 'activity' },
            { id: 'identity-overview-query', text: text.query, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'identity-overview-create', target: 'identity-overview-collect' },
          { source: 'identity-overview-collect', target: 'identity-overview-lookup' },
          { source: 'identity-overview-lookup', target: 'identity-overview-query' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default IdentityOverview;
