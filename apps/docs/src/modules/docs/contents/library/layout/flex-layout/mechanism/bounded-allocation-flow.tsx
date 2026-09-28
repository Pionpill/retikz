import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { figureI18n } from './bounded-allocation-flow.i18n';
/** 配图语言参数 */
export type BoundedAllocationFlowProps = { lang?: Lang };
/** 当前小节的处理顺序与关键边界 */
const BoundedAllocationFlow: FC<BoundedAllocationFlowProps> = props => {
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
      <FlowLayout
        id="bounded"
        kind="grid"
        placements={[
          ['free', 'share', 'clamp'],
          ['finish', 'again', null],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'free', text: text(0), role: 'activity' },
            { id: 'share', text: text(1), role: 'activity' },
            { id: 'clamp', text: text(2), role: 'activity', kind: 'docs.logic.important' },
            { id: 'again', text: text(3), role: 'gateway' },
            { id: 'finish', text: text(4), role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'free', target: 'share' },
          { source: 'share', target: 'clamp' },
          { source: 'clamp', target: 'again' },
          { source: 'again', target: 'share', label: labels[5][0] },
          { source: 'again', target: 'finish', label: labels[6][0] },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default BoundedAllocationFlow;
