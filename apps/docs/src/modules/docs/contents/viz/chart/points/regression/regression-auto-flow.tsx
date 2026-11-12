import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { regressionAutoFlowI18n } from './regression-auto-flow.i18n';

/** 自动拟合流程图的语言参数 */
export type RegressionAutoFlowProps = Readonly<{ lang?: Lang }>;

/** 从候选输入，经同组评分到获胜趋势的横向流程 */
const RegressionAutoFlow: FC<RegressionAutoFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = regressionAutoFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="auto-selection" kind="linear" direction="right" align="center">
        <FlowLayout id="candidate-inputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              {
                id: 'defaults',
                role: 'resource',
                text: [
                  { text: text.defaults, font: { size: 14 } },
                  { text: 'linear · quadratic · logarithmic', fill: 'gray', font: { size: 12 } },
                  { text: 'exponential · power', fill: 'gray', font: { size: 12 } },
                ],
              },
              {
                id: 'custom',
                role: 'resource',
                text: [
                  { text: text.custom, font: { size: 14 } },
                  { text: text.customDetail, fill: 'gray', font: { size: 12 } },
                ],
              },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[
            {
              id: 'score',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
              text: [
                { text: text.score, font: { size: 14 } },
                { text: text.scoreDetail, fill: 'gray', font: { size: 12 } },
              ],
            },
            {
              id: 'render',
              role: 'activity',
              text: [
                { text: text.render, font: { size: 14 } },
                { text: text.renderDetail, fill: 'gray', font: { size: 12 } },
              ],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'defaults', target: 'score', routing: { kind: 'orthogonal' } },
          { source: 'custom', target: 'score', routing: { kind: 'orthogonal' } },
          { source: 'score', target: 'render' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default RegressionAutoFlow;
