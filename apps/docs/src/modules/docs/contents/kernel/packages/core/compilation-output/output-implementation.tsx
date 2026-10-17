import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { outputImplementationI18n } from './output-implementation.i18n';

/** 编译产物示意图 */
export type OutputImplementationProps = { lang?: Lang };
/** 编译产物示意图 */
const Figure: FC<OutputImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const labels = outputImplementationI18n[lang];
  const items = labels.map((label, index) => ({
    id: `s${index}`,
    role: 'activity' as const,
    ...(index === 1 || (index >= 4 && index <= 6) ? { kind: 'docs.logic.important' } : {}),
    text: label.split('\n').map((text, line) => ({ text, ...(line ? { font: { size: 12 }, fill: 'gray' } : {}) })),
  }));
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="main" kind="linear" direction="right" gap={48} align="center">
        <FlowLayout id="stages" kind="linear" direction="down" gap={16} itemWidth="match-largest">
          <FlowEntities items={items.slice(0, 3)} />
        </FlowLayout>
        <FlowEntities items={items.slice(3, 4)} />
        <FlowLayout id="outputs" kind="linear" direction="down" gap={16} itemWidth="match-largest">
          <FlowEntities items={items.slice(4)} />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          ...[0, 1].map(index => ({
            source: { id: `s${index}`, side: 'bottom' as const },
            target: { id: `s${index + 1}`, side: 'top' as const },
          })),
          {
            source: { id: 's2', side: 'right' as const },
            target: { id: 's3', side: 'left' as const },
            routing: { kind: 'orthogonal' as const, cornerRadius: 0 },
          },
          ...items.slice(4).map(item => ({
            source: { id: 's3', side: 'right' as const },
            target: { id: item.id, side: 'left' as const },
            routing: { kind: 'orthogonal' as const, cornerRadius: 0 },
          })),
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Figure;
