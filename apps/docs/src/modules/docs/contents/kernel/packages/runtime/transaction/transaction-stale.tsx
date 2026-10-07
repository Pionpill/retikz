import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { transactionStaleI18n } from './transaction-stale.i18n';

/** 过时更新示意图的语言配置 */
export type TransactionStaleProps = Readonly<{ lang?: Lang }>;
/** 按时间展示准备中的更新如何落后于已发布版本 */
const TransactionStale: FC<TransactionStaleProps> = props => {
  const { lang = 'zh' } = props;
  const text = transactionStaleI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="transaction-stale" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'stale-read', text: text.read, role: 'activity' },
            { id: 'stale-publish', text: text.publish, role: 'activity' },
            { id: 'stale-submit', text: text.submit, role: 'activity' },
            { id: 'stale-reject', text: text.reject, role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'stale-read', target: 'stale-publish' },
          { source: 'stale-publish', target: 'stale-submit' },
          { source: 'stale-submit', target: 'stale-reject' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TransactionStale;
