import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { executionLookupI18n } from './execution-lookup.i18n';

/** 名称与坐标示意图的显示语言 */
export type ExecutionLookupProps = { lang?: Lang };

/** 展示局部几何投影与同名绑定的查找顺序 */
const ExecutionLookup: FC<ExecutionLookupProps> = props => {
  const { lang = 'zh' } = props;
  const labels = executionLookupI18n[lang];
  const stages = [
    { id: 'local', member: '[10, 5]' },
    { id: 'global', member: '[110, 5]' },
    { id: 'inner', member: 'entryMap.get("A")' },
    { id: 'path', member: 'lookupReference("A")' },
    { id: 'outer', member: 'popFrame()' },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="execution-lookup"
        kind="grid"
        gap={{ row: 24, column: 32 }}
        placements={[
          ['local', 'global', 'inner'],
          [null, 'outer', 'path'],
        ]}
      >
        <FlowEntities
          items={stages.map(({ id, member }) => ({
            id,
            role: 'activity',
            layout: { width: 220 },
            text: [{ text: labels[id] }, { text: member, font: { size: 12 }, fill: 'gray' }],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ['local', 'global'],
          ['global', 'inner'],
          ['inner', 'path'],
          ['path', 'outer'],
        ].map(([source, target]) => ({ source: { id: source }, target: { id: target } }))}
      />
    </PreviewFlowDiagram>
  );
};
export default ExecutionLookup;
