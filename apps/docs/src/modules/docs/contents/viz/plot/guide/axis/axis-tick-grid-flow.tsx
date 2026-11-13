import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { axisTickGridFlowI18n } from './axis-tick-grid-flow.i18n';

/** 流程图语言 */
export type AxisTickGridFlowProps = { lang?: Lang };
/** 展示辅助组件的真实解析与输出关系 */
const Diagram: FC<AxisTickGridFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = axisTickGridFlowI18n[lang];
  const label = (value: string) =>
    value.split('\n').map((line, index) => ({
      text: line,
      font: { size: index === 0 ? 14 : 12 },
      ...(index === 0 ? {} : { fill: 'gray' }),
    }));
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="rows" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="row-0" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'source', role: 'resource', text: label(text.source) },
              { id: 'candidate', role: 'resource', text: label(text.candidate) },
              { id: 'visible', role: 'activity', text: label(text.visible) },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'grid', role: 'activity', text: label(text.grid) },
              { id: 'major', role: 'activity', text: label(text.major) },
              { id: 'minor', role: 'activity', text: label(text.minor) },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'source', target: 'candidate', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'candidate', target: 'visible', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'visible', target: 'grid', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'grid', target: 'major', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'major', target: 'minor', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Diagram;
