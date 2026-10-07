import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pipelineFigureI18n } from './pipeline-figure.i18n';

/** 图示属性 */
export type PipelineFigureProps = { lang?: Lang };

/** 展示当前小节的集合处理机制 */
const PipelineFigure: FC<PipelineFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = pipelineFigureI18n[lang];
  return (
    <PreviewFlowDiagram
      layout={{ direction: 'down' }}
      {...logicFigureGraphProps()}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="source-order" kind="linear" direction="down" containerWidth="match-largest">
        {[0, 3, 6].map(start => (
          <FlowLayout key={start} id={`row-${start}`} kind="linear" direction="right" itemWidth="fill">
            <FlowEntities
              items={t.slice(start, start + 3).map((text, offset) => ({
                id: `p${start + offset}`,
                text: text.split('\n').map((line, n) => ({
                  text: line,
                  font: { size: n === 0 ? 14 : 12 },
                  ...(n === 0 ? {} : { fill: 'gray' }),
                })),
                role: [0, 4, 6, 8].includes(start + offset) ? 'state' : 'activity',
                ...([4, 6].includes(start + offset)
                  ? { kind: LogicFigureEntityKind.ImportantData }
                  : [3, 5, 7].includes(start + offset)
                    ? { kind: LogicFigureEntityKind.Important }
                    : {}),
              }))}
            />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={t.slice(1).map((_, i) => ({
          source: `p${i}`,
          target: `p${i + 1}`,
          ...(i === 2 || i === 5
            ? {
                source: { id: `p${i}`, side: 'bottom' as const },
                target: { id: `p${i + 1}`, side: 'top' as const },
                routing: { kind: 'orthogonal' as const },
              }
            : {}),
        }))}
      />
    </PreviewFlowDiagram>
  );
};

export default PipelineFigure;
