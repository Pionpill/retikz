import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { blendBoundaryI18n } from './blend-boundary.i18n';

/** 原理图的语言参数 */
export type BlendBoundaryProps = { lang?: Lang };

/** 展示本节的实际数据依赖与处理分支 */
const BlendBoundary: FC<BlendBoundaryProps> = props => {
  const { lang = 'zh' } = props;
  const labels = blendBoundaryI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="boundary-layout" kind="linear" direction="right">
        <FlowLayout id="current-layout" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'current', text: text(0), role: 'state' },
              { id: 'a', text: text(1), role: 'activity' },
              { id: 'b', text: text(2), role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="isolated-layout" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'isolation', text: text(3), role: 'state' },
              { id: 'buffer', text: text(4), role: 'activity' },
              { id: 'group', text: text(5), role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'current', target: 'a' },
          { source: 'a', target: 'b' },
          { source: 'isolation', target: 'buffer' },
          { source: 'buffer', target: 'group' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default BlendBoundary;
