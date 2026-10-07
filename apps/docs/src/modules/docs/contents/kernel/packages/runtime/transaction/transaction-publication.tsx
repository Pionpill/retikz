import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { transactionPublicationI18n } from './transaction-publication.i18n';

/** 事务图的语言配置 */
export type TransactionPublicationProps = Readonly<{ lang?: Lang }>;
/** 展示事务准备与发布的阶段关系 */
const TransactionPublication: FC<TransactionPublicationProps> = props => {
  const { lang = 'zh' } = props;
  const text = transactionPublicationI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="transaction-publication" kind="linear" direction="right" align="center">
        <FlowLayout id="column-0" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'prepare', text: text.prepare, role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout id="column-1" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'equal', text: text.equal, role: 'state' },
              { id: 'changed', text: text.changed, role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'retain', text: text.retain, role: 'state' },
              { id: 'compute', text: text.compute, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-3" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'success', text: text.success, role: 'state' },
              { id: 'failure', text: text.failure, role: 'state' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'prepare', target: 'equal' },
          { source: 'prepare', target: 'changed' },
          { source: 'equal', target: 'retain' },
          { source: 'changed', target: 'compute' },
          { source: 'compute', target: 'success', label: text.successLabel },
          { source: 'compute', target: 'failure', label: text.failureLabel },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TransactionPublication;
