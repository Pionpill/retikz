import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { flowStagesI18n } from './flow-stages.i18n';

/** Flow 阶段图语言 */
export type FlowStagesProps = Readonly<{ lang?: Lang }>;

/** 编译阶段的数据交接 */
const Demo: FC<FlowStagesProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowStagesI18n[lang];

  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowEntities
        items={[
          {
            id: 'source',
            role: 'resource',
            text: [{ text: copy.source }, { text: copy.sourceNote, fill: 'gray', font: { size: 12 } }],
          },
          {
            id: 'resolve',
            role: 'activity',
            text: [{ text: copy.resolve }, { text: copy.resolveNote, fill: 'gray', font: { size: 12 } }],
          },
          {
            id: 'measure',
            role: 'activity',
            text: [{ text: copy.measure }, { text: copy.measureNote, fill: 'gray', font: { size: 12 } }],
          },
          {
            id: 'layout',
            role: 'activity',
            kind: LogicFigureEntityKind.Important,
            text: [{ text: copy.layout }, { text: copy.layoutNote, fill: 'gray', font: { size: 12 } }],
          },
          {
            id: 'materialize',
            role: 'activity',
            text: [{ text: copy.materialize }, { text: copy.materializeNote, fill: 'gray', font: { size: 12 } }],
          },
        ]}
      />
      <FlowRelations
        items={[
          ['source', 'resolve'],
          ['resolve', 'measure'],
          ['measure', 'layout'],
          ['layout', 'materialize'],
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;
