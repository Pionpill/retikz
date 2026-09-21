import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { flowI18n } from './pattern-flow.i18n';

/** 流程图的语言参数 */
export type VisualFlowProps = { lang?: Lang };
/** 展示当前视觉能力的实际处理顺序 */
const VisualFlow: FC<VisualFlowProps> = props => {
  const { lang = 'zh' } = props;
  const labels = flowI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="pipeline" kind="linear" direction="right">
        <FlowEntities items={labels.map((text, index) => ({ id: `step-${index}`, text, role: 'activity' }))} />
      </FlowLayout>
      <FlowRelations
        items={labels.slice(1).map((_, index) => ({ source: `step-${index}`, target: `step-${index + 1}` }))}
      />
    </PreviewFlowDiagram>
  );
};
export default VisualFlow;
