import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { figureI18n } from './transaction-flow.i18n';

/** 配图语言参数 */
export type TransactionFlowProps = { lang?: Lang };
/** 当前小节的处理顺序与关键边界 */
const TransactionFlow: FC<TransactionFlowProps> = props => {
  const { lang = 'zh' } = props;
  const labels = figureI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="transaction" kind="linear" direction="down" itemWidth="match-largest">
        <FlowLayout id="prepare" kind="linear" direction="right">
          <FlowEntities
            items={[
              { id: 'parse', text: text(0), role: 'activity' },
              { id: 'probe', text: text(1), role: 'activity' },
              { id: 'solve', text: text(2), role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="publish" kind="linear" direction="right">
          <FlowEntities
            items={[
              { id: 'output', text: text(4), role: 'resource' },
              { id: 'replay', text: text(3), role: 'activity', kind: 'docs.logic.important' },
              { id: 'unused', text: text(5), role: 'state', kind: 'docs.logic.secondary' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'parse', target: 'probe' },
          { source: 'probe', target: 'solve' },
          { source: 'solve', target: 'replay', routing: { kind: 'orthogonal' } },
          { source: 'solve', target: 'unused' },
          { source: 'replay', target: 'output' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TransactionFlow;
