import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { figureI18n } from './placement-flow.i18n';

/** 配图语言参数 */
export type MeasurementFlowProps = { lang?: Lang };
/** 当前小节的处理顺序与关键边界 */
const MeasurementFlow: FC<MeasurementFlowProps> = props => {
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
      <FlowLayout id="measurement" kind="linear" direction="right">
        <FlowEntities
          items={[
            { id: 'probe', text: text(0), role: 'activity' },
            { id: 'freeze', text: text(1), role: 'activity', kind: 'docs.logic.important' },
            { id: 'exact', text: text(2), role: 'activity' },
            { id: 'place', text: text(3), role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'probe', target: 'freeze' },
          { source: 'freeze', target: 'exact' },
          { source: 'exact', target: 'place' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default MeasurementFlow;
