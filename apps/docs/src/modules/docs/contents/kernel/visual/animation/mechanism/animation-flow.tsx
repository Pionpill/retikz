import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { animationFlowI18n } from './animation-flow.i18n';

/** 原理图的语言参数 */
export type AnimationFlowProps = { lang?: Lang };

/** 展示本节的实际数据依赖与处理分支 */
const AnimationFlow: FC<AnimationFlowProps> = props => {
  const { lang = 'zh' } = props;
  const labels = animationFlowI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="evaluation-layout" kind="linear" direction="down">
        <FlowLayout id="active-layout" kind="linear" direction="right">
          <FlowEntities
            items={[
              { id: 'local', text: text(0), role: 'activity' },
              { id: 'interval', text: text(1), role: 'gateway' },
              { id: 'direction', text: text(2), role: 'activity' },
              { id: 'segment', text: text(3), role: 'activity' },
              { id: 'value', text: text(4), role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowEntities items={[{ id: 'base', text: text(5), role: 'state' }]} />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'local', target: 'interval' },
          { source: 'interval', target: 'direction' },
          { source: 'interval', target: 'base' },
          { source: 'direction', target: 'segment' },
          { source: 'segment', target: 'value' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default AnimationFlow;
