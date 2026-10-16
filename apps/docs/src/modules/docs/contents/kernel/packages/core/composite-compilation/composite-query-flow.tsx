import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { Layout, Path } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compositeQueryFlowI18n } from './composite-query-flow.i18n';

/** 查询与重放流程图的语言 */
export type CompositeQueryFlowProps = { lang?: Lang };

/** 区分尺寸缓存、完整候选复用与最终提交 */
const Figure: FC<CompositeQueryFlowProps> = props => {
  const { lang = 'zh' } = props;
  const labels = compositeQueryFlowI18n[lang];
  const items = labels.nodes.map((label, index) => ({
    id: `q${index}`,
    role: [1, 4, 8].includes(index) ? ('gateway' as const) : ('activity' as const),
    ...([0, 2, 5, 7].includes(index) ? { kind: 'docs.logic.important' } : {}),
    text: label.split('\n').map((text, line) => ({
      text,
      ...(line && ![1, 4, 8].includes(index) ? { font: { size: 12 }, fill: 'gray' } : {}),
    })),
  }));
  const labelOf = (text: string) => ({ text, font: { size: 12 }, textColor: 'gray' });
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <PreviewFlowDiagram {...logicFigureGraphProps()}>
        <FlowLayout
          id="query-main"
          kind="linear"
          direction="right"
          align="start"
          gap={96}
          containerHeight="match-largest"
        >
          {[
            [0, 4],
            [4, 8],
            [8, 11],
          ].map(([start, end], index) => (
            <FlowGroup
              key={start}
              id={`query-group-${index}`}
              caption={{ title: { text: labels.groups[index], textColor: 'gray', font: { size: 12 } } }}
              background={{ fill: 'none' }}
              border={{ stroke: 'gray', dashPattern: [4, 3] }}
              padding={16}
              cornerRadius={4}
            >
              <FlowLayout
                id={`query-column-${index}`}
                kind="linear"
                direction="down"
                gap={24}
                itemWidth="match-largest"
              >
                <FlowEntities items={items.slice(start, end)} />
              </FlowLayout>
            </FlowGroup>
          ))}
        </FlowLayout>
        <FlowRelations
          items={[
            { source: 'q0', target: 'q1' },
            { source: 'q1', target: 'q2', label: labelOf(labels.edges.miss) },
            { source: 'q2', target: 'q3' },
            {
              source: 'q3',
              target: 'q4',
              routing: { kind: 'orthogonal' },
            },
            { source: 'q4', target: 'q5', label: labelOf(labels.edges.no) },
            { source: 'q5', target: 'q6' },
            { source: 'q6', target: 'q7' },
            { source: 'q7', target: 'q8', routing: { kind: 'orthogonal' } },
            { source: 'q8', target: 'q9', label: labelOf(labels.edges.changed) },
            { source: 'q9', target: 'q10' },
          ]}
        />
      </PreviewFlowDiagram>
      {[
        { source: 'q1', target: 'q3', side: 'left', offset: -32, label: labels.edges.hit },
        { source: 'q4', target: 'q6', side: 'right', offset: 40, label: labels.edges.yes },
        { source: 'q8', target: 'q10', side: 'right', offset: 32, label: labels.edges.same },
      ].map(({ source, target, side, offset, label }) => (
        <Path
          key={source}
          way={[
            { id: source, anchor: side },
            { id: source, anchor: side, offset: [offset, 0] },
            { id: target, anchor: side, offset: [offset, 0] },
            { id: target, anchor: side },
          ]}
          arrow="->"
          style={{ stroke: '#777777' }}
          label={{ ...labelOf(label), placement: 'inside', sloped: false, position: 0.5, interrupt: true, gap: 4 }}
        />
      ))}
    </Layout>
  );
};
export default Figure;
