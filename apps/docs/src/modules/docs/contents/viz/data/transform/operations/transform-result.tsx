import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps, logicFigureRelationKinds } from '@/modules/docs/components/logic-figure';

import { transformResultI18n } from './transform-result.i18n';

/** 图示语言 */
export type DemoProps = { lang?: Lang };
/** 用具体字段和执行状态说明本阶段的输入与输出 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  const rows = transformResultI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout id="comparison" kind="linear" direction="down">
        {rows.map((stages, row) => (
          <FlowLayout key={row} id={`case-${row}`} kind="linear" direction="right" align="center">
            <FlowEntities
              items={stages.map(([title, detail], index) => ({
                id: `case-${row}-${index}`,
                role: 'activity' as const,
                text: [{ text: title }, { text: detail, fill: 'gray', font: { size: 12 } }],
              }))}
            />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={rows.flatMap((stages, row) =>
          stages.slice(1).map((_, index) => ({
            source: `case-${row}-${index}`,
            target: `case-${row}-${index + 1}`,
          })),
        )}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;
