import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { axesLoweringI18n } from './axes-lowering.i18n';

/** 配图语言参数 */
export type AxesLoweringProps = { lang?: Lang };

/** Axes IR 下沉为 Core 图元的流程 */
const AxesLowering: FC<AxesLoweringProps> = props => {
  const { lang = 'zh' } = props;
  const labels = axesLoweringI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="lowering-flow" kind="linear" direction="right">
        <FlowEntities
          items={[
            { id: 'ir', text: text(0), role: 'resource' },
            { id: 'definition', text: text(1), role: 'activity' },
            { id: 'lowering', text: text(2), role: 'activity', kind: 'docs.logic.important' },
            { id: 'core-ir', text: text(3), role: 'resource' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'ir', target: 'definition' },
          { source: 'definition', target: 'lowering' },
          { source: 'lowering', target: 'core-ir' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default AxesLowering;
