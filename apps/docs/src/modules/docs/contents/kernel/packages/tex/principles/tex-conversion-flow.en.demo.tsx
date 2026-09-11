import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 展示公式从 Core 入口经 Tex lowering 回到 Core Scene 的主链 */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down' }}>
    <FlowLayout id="tex-conversion" direction="down" align="center" gap={48}>
      <FlowLayout id="input-row" direction="right" align="center" gap={48}>
        <FlowEntities
          items={[
            { id: 'core-text', text: 'Core text pipeline', role: 'participant' },
            { id: 'lower-tex', text: 'LowerTex adapter', role: 'activity' },
            {
              id: 'mathjax-engine',
              text: 'MathJax SVG engine',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
            },
          ]}
        />
      </FlowLayout>
      <FlowLayout id="output-row" direction="right" align="center" gap={48}>
        <FlowEntities
          items={[
            { id: 'svg-lowerer', text: 'SVG lowerer', role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'lowered-tex', text: 'LoweredTex', role: 'resource' },
            { id: 'core-scene', text: 'Core Scene output', role: 'participant' },
          ]}
        />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'core-text', target: 'lower-tex', label: 'math run' },
        { source: 'lower-tex', target: 'mathjax-engine' },
        { source: 'mathjax-engine', target: 'svg-lowerer', routing: { kind: 'orthogonal' } },
        { source: 'svg-lowerer', target: 'lowered-tex' },
        { source: 'lowered-tex', target: 'core-scene' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
