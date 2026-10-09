import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps, logicFigureRelationKinds } from '@/modules/docs/components/logic-figure';

import { computationModesI18n } from './computation-modes.i18n';

/** 图示语言 */
export type DemoProps = { lang?: Lang };
/** 对比同一变换链在三种执行模式下的计算位置与预检结果 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  const rows = computationModesI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout id="comparison" kind="linear" direction="down" containerWidth="match-largest">
        {rows.map((stages, row) => (
          <FlowLayout key={row} id={`case-${row}`} kind="linear" direction="right" align="center" itemWidth="fill">
            <FlowEntities
              items={stages.map(([title, detail], index) => ({
                id: `case-${row}-${index}`,
                role: 'activity' as const,
                ...(index === stages.length - 1
                  ? { status: row === 1 ? ('error' as const) : ('success' as const) }
                  : {}),
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
