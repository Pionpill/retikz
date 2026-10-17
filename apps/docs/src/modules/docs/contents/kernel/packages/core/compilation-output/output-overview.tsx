import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { outputOverviewI18n } from './output-overview.i18n';

/** 编译产物示意图 */
export type OutputOverviewProps = { lang?: Lang };
/** 编译产物示意图 */
const Figure: FC<OutputOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const labels = outputOverviewI18n[lang];
  const items = labels.map((label, index) => ({
    id: `s${index}`,
    role: 'activity' as const,
    ...(index === 1 ? { kind: 'docs.logic.important' } : {}),
    text: label.split('\n').map((text, line) => ({ text, ...(line ? { font: { size: 12 }, fill: 'gray' } : {}) })),
  }));
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="main" kind="linear" direction="down" containerWidth="match-largest">
        {[0].map(start => (
          <FlowLayout key={start} id={`row-${start}`} kind="linear" direction="right" itemWidth="fill">
            <FlowEntities items={items.slice(start, start + 3)} />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={labels.slice(1).map((_, index) =>
          index % 3 === 2
            ? {
                source: { id: `s${index}`, side: 'bottom' as const },
                target: { id: `s${index + 1}`, side: 'top' as const },
                routing: { kind: 'orthogonal' as const, cornerRadius: 0 },
              }
            : { source: `s${index}`, target: `s${index + 1}` },
        )}
      />
    </PreviewFlowDiagram>
  );
};
export default Figure;
