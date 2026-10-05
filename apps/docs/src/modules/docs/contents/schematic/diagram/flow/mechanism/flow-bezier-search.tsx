import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { flowBezierSearchI18n } from './flow-bezier-search.i18n';

/** 有限候选流程语言 */
export type FlowBezierSearchProps = Readonly<{ lang?: Lang }>;

/** 基线成功可早停，扩展时完整比较一轮再决定是否继续 */
const Demo: FC<FlowBezierSearchProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowBezierSearchI18n[lang];
  const stages = [
    ['baseline', copy.baseline, copy.baselineNote],
    ['target', copy.target, copy.targetNote],
    ['control', copy.control, copy.controlNote],
    ['check', copy.check, copy.checkNote],
    ['score', copy.score, copy.scoreNote],
    ['result', copy.result, copy.resultNote],
  ];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="rows" kind="linear" direction="down" gap={56}>
        {[0, 1].map(row => (
          <FlowLayout key={row} id={`row-${row}`} kind="linear" direction="right">
            <FlowEntities
              items={stages.slice(row * 3, row * 3 + 3).map(([id, title, note]) => ({
                id,
                role: 'activity',
                text: [title, { text: note, fill: 'gray', font: { size: 12 } }],
              }))}
            />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={[
          ['baseline', 'target'],
          ['target', 'control'],
          { source: 'control', target: 'check', routing: { kind: 'orthogonal' } },
          ['check', 'score'],
          ['score', 'result'],
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;
