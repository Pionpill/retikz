import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compositeImplementationI18n } from './composite-implementation.i18n';

/** 复合编译图的语言 */
export type CompositeImplementationProps = { lang?: Lang };
/** 展示回调内的可选查询与输出树的分类提交 */
const Figure: FC<CompositeImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const labels = compositeImplementationI18n[lang];
  const items = (ids: Array<number>) =>
    ids.map(id => ({
      id: `s${id}`,
      role: 'activity' as const,
      ...([3, 5, 8, 12].includes(id) ? { kind: 'docs.logic.important' } : {}),
      text: labels[id]
        .split('\n')
        .map((text, line) => ({ text, ...(line ? { font: { size: 12 }, fill: 'gray' } : {}) })),
    }));
  const edge = (source: number, target: number) => ({
    source: { id: `s${source}`, side: 'bottom' as const },
    target: { id: `s${target}`, side: 'top' as const },
    routing: { kind: 'orthogonal' as const, cornerRadius: 0 },
  });
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="main" kind="linear" direction="down" gap={36} align="center">
        <FlowEntities items={items([0])} />
        <FlowLayout id="queries" kind="linear" direction="right" gap={32} align="start">
          {[
            [1, 2],
            [3, 4],
            [5, 6],
          ].map((ids, index) => (
            <FlowLayout
              key={index}
              id={`query-${index}`}
              kind="linear"
              direction="down"
              gap={36}
              itemWidth="match-largest"
            >
              <FlowEntities items={items(ids)} />
            </FlowLayout>
          ))}
        </FlowLayout>
        <FlowLayout id="return" kind="linear" direction="right" gap={32}>
          <FlowEntities items={items([7, 8])} />
        </FlowLayout>
        <FlowLayout id="outputs" kind="linear" direction="right" gap={32} align="start">
          {[
            [9, 10],
            [11, 12],
            [13, 14],
          ].map((ids, index) => (
            <FlowLayout
              key={index}
              id={`output-${index}`}
              kind="linear"
              direction="down"
              gap={36}
              itemWidth="match-largest"
            >
              <FlowEntities items={items(ids)} />
            </FlowLayout>
          ))}
        </FlowLayout>
        <FlowEntities items={items([15])} />
      </FlowLayout>
      <FlowRelations
        items={[
          ...[1, 3, 5].map(id => edge(0, id)),
          edge(1, 2),
          edge(3, 4),
          edge(5, 6),
          ...[2, 4, 6].map(id => edge(id, 7)),
          { source: 's7', target: 's8' },
          ...[9, 11, 13].map(id => edge(8, id)),
          edge(9, 10),
          edge(11, 12),
          edge(13, 14),
          ...[10, 12, 14].map(id => edge(id, 15)),
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Figure;
