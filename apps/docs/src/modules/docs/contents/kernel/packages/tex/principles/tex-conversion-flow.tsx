import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { texConversionFlowI18n } from './tex-conversion-flow.i18n';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 展示公式从 Core 入口经 Tex lowering 回到 Core Scene 的主链 */
export type TexConversionFlowI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<TexConversionFlowI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = texConversionFlowI18n[lang];

  return (
    <FlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down' }}>
      <FlowLayout kind="linear" id="tex-conversion" direction="down" align="center" gap={48}>
        <FlowLayout kind="linear" id="input-row" direction="right" align="center" gap={48}>
          <FlowEntities
            items={[
              { id: 'core-text', text: i18n.label1, role: 'participant' },
              { id: 'lower-tex', text: i18n.label2, role: 'activity' },
              {
                id: 'mathjax-engine',
                text: i18n.label3,
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="output-row" direction="right" align="center" gap={48}>
          <FlowEntities
            items={[
              { id: 'svg-lowerer', text: i18n.label4, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'lowered-tex', text: 'LoweredTex', role: 'resource' },
              { id: 'core-scene', text: i18n.label6, role: 'participant' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'core-text', target: 'lower-tex', label: i18n.label7 },
          { source: 'lower-tex', target: 'mathjax-engine' },
          { source: 'mathjax-engine', target: 'svg-lowerer', routing: { kind: 'orthogonal' } },
          { source: 'svg-lowerer', target: 'lowered-tex' },
          { source: 'lowered-tex', target: 'core-scene' },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;
