import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { transactionFlowI18n } from './transaction-flow.i18n';

/** 事务图的语言配置 */
export type TransactionFlowProps = Readonly<{ lang?: Lang }>;
/** 展示事务准备与发布的阶段关系 */
const TransactionFlow: FC<TransactionFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = transactionFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="transaction-flow" kind="linear" direction="right" align="center">
        <FlowLayout id="column-0" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'input', text: text.input, role: 'activity' },
              { id: 'command', text: text.command, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-1" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'create', text: text.create, role: 'activity' },
              { id: 'update', text: text.update, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'read', text: text.read, role: 'state' },
              { id: 'dispose', text: text.dispose, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'create' },
          { source: 'create', target: 'read' },
          { source: 'command', target: 'update' },
          { source: 'update', target: 'read' },
          { source: 'read', target: 'dispose' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TransactionFlow;
