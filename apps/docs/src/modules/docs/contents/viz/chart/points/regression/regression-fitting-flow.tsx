import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { regressionFittingFlowI18n } from './regression-fitting-flow.i18n';

/** 拟合流程图的语言参数 */
export type RegressionFittingFlowProps = Readonly<{ lang?: Lang }>;

/** 展示回归图从模型定义到曲线渲染的包职责 */
const Demo: FC<RegressionFittingFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = regressionFittingFlowI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="fitting-flow" kind="linear" direction="right" align="start" gap={24}>
        {[0, 3].map(start => (
          <FlowLayout
            key={start}
            id={`column-${start}`}
            kind="linear"
            direction="down"
            gap={16}
            align="center"
            itemWidth="match-largest"
          >
            <FlowEntities
              items={i18n.stages.slice(start, start + 3).map((stage, index) => ({
                id: `stage-${start + index}`,
                role: 'activity',
                ...([0, 2, 4].includes(start + index) ? { kind: LogicFigureEntityKind.Important } : {}),
                text: [
                  { text: stage.title, font: { size: 14 } },
                  { text: stage.detail, fill: 'gray', font: { size: 12 } },
                ],
              }))}
            />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={i18n.edges.map((label, index) => ({
          source: `stage-${index}`,
          target: `stage-${index + 1}`,
          label,
          ...(index === 2 ? { routing: { kind: 'orthogonal' as const } } : {}),
        }))}
      />
    </PreviewFlowDiagram>
  );
};

export default Demo;
