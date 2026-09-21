import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { blendFlowI18n } from './blend-flow.i18n';

/** 原理图的语言参数 */
export type BlendFlowProps = { lang?: Lang };

/** 展示本节的实际数据依赖与处理分支 */
const BlendFlow: FC<BlendFlowProps> = props => {
  const { lang = 'zh' } = props;
  const labels = blendFlowI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="composite-layout" kind="linear" direction="right">
        <FlowLayout id="inputs-layout" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'source', text: text(0), role: 'resource' },
              { id: 'backdrop', text: text(1), role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="operations-layout" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'blend', text: text(2), role: 'activity' },
              { id: 'alpha', text: text(3), role: 'activity' },
              { id: 'result', text: text(4), role: 'state' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'source', target: 'blend' },
          { source: 'backdrop', target: 'blend' },
          { source: 'source', target: 'alpha' },
          { source: 'backdrop', target: 'alpha' },
          { source: 'blend', target: 'alpha' },
          { source: 'alpha', target: 'result' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default BlendFlow;
