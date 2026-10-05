import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { allocationFigureI18n } from './allocation-figure.i18n';

export type AllocationFigureProps = { lang?: Lang };

/** 展示列宽到文字高度的单向尺寸依赖 */
const AllocationFigure: FC<AllocationFigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = allocationFigureI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()}>
      <FlowLayout kind="linear" id="grid-order" direction="right">
        <FlowEntities items={text.map((label, index) => ({ id: `step-${index}`, text: label, role: 'activity' }))} />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'step-0', target: 'step-1' },
          { source: 'step-1', target: 'step-2' },
          { source: 'step-2', target: 'step-3' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default AllocationFigure;
