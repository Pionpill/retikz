import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { transactionOverviewI18n } from './transaction-overview.i18n';

/** 事务图的语言配置 */
export type TransactionOverviewProps = Readonly<{ lang?: Lang }>;
/** 展示事务准备与发布的阶段关系 */
const TransactionOverview: FC<TransactionOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = transactionOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="transaction-overview" kind="linear" direction="right" align="center">
        <FlowLayout id="column-0" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'input', text: text.input, role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout id="column-1" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'prepare', text: text.prepare, role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[{ id: 'publish', text: text.publish, role: 'activity', kind: 'docs.logic.important' }]}
          />
        </FlowLayout>
        <FlowLayout id="column-3" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'read', text: text.read, role: 'state' }]} />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'prepare' },
          { source: 'prepare', target: 'publish' },
          { source: 'publish', target: 'read' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TransactionOverview;
