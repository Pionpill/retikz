import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { legendLoweringFlowI18n } from './legend-lowering-flow.i18n';

/** 流程图语言 */
export type LegendLoweringFlowProps = { lang?: Lang };
/** 展示辅助组件的真实解析与输出关系 */
const Diagram: FC<LegendLoweringFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = legendLoweringFlowI18n[lang];
  const label = (value: string) =>
    value.split('\n').map((line, index) => ({
      text: line,
      font: { size: index === 0 ? 14 : 12 },
      ...(index === 0 ? {} : { fill: 'gray' }),
    }));
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="rows" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="inputs" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'guide', role: 'resource', text: label(text.guide) },
              { id: 'descriptor', role: 'resource', text: label(text.descriptor) },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="resolution" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'resolve', role: 'activity', text: label(text.resolve) },
              { id: 'style', role: 'activity', text: label(text.style) },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="output" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'form', role: 'activity', text: label(text.form) },
              { id: 'scope', role: 'resource', text: label(text.scope) },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'guide', target: 'resolve', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'descriptor', target: 'resolve', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'resolve', target: 'form', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'style', target: 'form', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'form', target: 'scope', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Diagram;
