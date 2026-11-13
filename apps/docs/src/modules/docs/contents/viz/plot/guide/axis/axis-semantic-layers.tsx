import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { axisSemanticLayersI18n } from './axis-semantic-layers.i18n';

/** 流程图语言 */
export type AxisSemanticLayersProps = { lang?: Lang };
/** 展示辅助组件的真实解析与输出关系 */
const Diagram: FC<AxisSemanticLayersProps> = props => {
  const { lang = 'zh' } = props;
  const text = axisSemanticLayersI18n[lang];
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
              { id: 'axis', role: 'resource', text: label(text.axis) },
              { id: 'split', role: 'activity', text: label(text.split) },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'grid', role: 'resource', text: label(text.grid) },
              { id: 'line', role: 'resource', text: label(text.line) },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'axis', target: 'split', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'split', target: 'grid', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'split', target: 'line', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Diagram;
