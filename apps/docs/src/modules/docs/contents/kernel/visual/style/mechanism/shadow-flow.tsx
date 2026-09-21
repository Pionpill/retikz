import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { shadowFlowI18n } from './shadow-flow.i18n';

/** 原理图的语言参数 */
export type ShadowFlowProps = { lang?: Lang };

/** 展示本节的实际数据依赖与处理分支 */
const ShadowFlow: FC<ShadowFlowProps> = props => {
  const { lang = 'zh' } = props;
  const labels = shadowFlowI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="shadow-layout" kind="linear" direction="right">
        <FlowLayout id="resolve-layout" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'input', text: text(0), role: 'resource' },
              { id: 'resolve', text: text(1), role: 'activity' },
              { id: 'geometry', text: text(2), role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="consumers-layout" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'bounds', text: text(3), role: 'activity' },
              { id: 'draw', text: text(4), role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'resolve' },
          { source: 'resolve', target: 'geometry' },
          { source: 'geometry', target: 'bounds' },
          { source: 'geometry', target: 'draw' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ShadowFlow;
