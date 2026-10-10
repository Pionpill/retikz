import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps, logicFigureRelationKinds } from '@/modules/docs/components/logic-figure';

import { statisticsOverviewI18n } from './statistics-overview.i18n';

/** 图示语言 */
export type DemoProps = { lang?: Lang };
/** 对照归约字段、选择记录与拟合模型的独立链路 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  const { input, output, branches } = statisticsOverviewI18n[lang];
  const entity = (id: string, [title, detail]: [string, string]) => ({
    id,
    role: 'activity' as const,
    text: [{ text: title }, { text: detail, fill: 'gray', font: { size: 12 } }],
  });
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout id="comparison" kind="linear" direction="right" align="center">
        <FlowEntities items={[entity('input', input)]} />
        <FlowLayout id="branches" kind="linear" direction="down">
          {branches.map((stages, row) => (
            <FlowLayout key={row} id={`case-${row}`} kind="linear" direction="right" align="center">
              <FlowEntities items={stages.map((label, index) => entity(`case-${row}-${index}`, label))} />
            </FlowLayout>
          ))}
        </FlowLayout>
        <FlowEntities items={[entity('output', output)]} />
      </FlowLayout>
      <FlowRelations
        items={branches.flatMap((_, row) => [
          { source: 'input', target: `case-${row}-0` },
          { source: `case-${row}-0`, target: `case-${row}-1` },
          { source: `case-${row}-1`, target: 'output' },
        ])}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;
