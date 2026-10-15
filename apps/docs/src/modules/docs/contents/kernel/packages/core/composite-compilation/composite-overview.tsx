import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compositeOverviewI18n } from './composite-overview.i18n';

/** 复合编译图的语言 */
export type CompositeOverviewProps = { lang?: Lang };
/** 单行展示复合编译主线，并分组标记布局编译步骤 */
const Figure: FC<CompositeOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const { stages, compileGroup } = compositeOverviewI18n[lang];
  const items = stages.map((label, index) => ({
    id: `s${index}`,
    role: 'activity' as const,
    ...([1, 3].includes(index) ? { kind: 'docs.logic.important' } : {}),
    ...([0, 3].includes(index) ? { layout: { margin: { bottom: 8 } } } : {}),
    text: label.split('\n').map((text, line) => ({ text, ...(line ? { font: { size: 12 }, fill: 'gray' } : {}) })),
  }));
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="main" kind="linear" direction="right" align="end" gap={24}>
        <FlowEntities items={items.slice(0, 1)} />
        <FlowGroup
          id="compile-group"
          caption={{ title: { text: compileGroup, textColor: 'gray', font: { size: 12 } } }}
          border={{ stroke: 'gray', dashPattern: [4, 3] }}
          padding={16}
          cornerRadius={4}
        >
          <FlowLayout id="compile-steps" kind="linear" direction="right" gap={32}>
            <FlowEntities items={items.slice(1, 3)} />
          </FlowLayout>
        </FlowGroup>
        <FlowEntities items={items.slice(3)} />
      </FlowLayout>
      <FlowRelations
        items={stages
          .slice(1)
          .map((_, i) => ({ source: { id: `s${i}`, side: 'right' }, target: { id: `s${i + 1}`, side: 'left' } }))}
      />
    </PreviewFlowDiagram>
  );
};
export default Figure;
