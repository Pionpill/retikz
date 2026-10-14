import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pathImplementationI18n } from './path-implementation.i18n';

/** 路径实现流程的语言 */
export type PathImplementationProps = { lang?: Lang };
/** 两列展示消费步骤及其后处理 */
const PathImplementation: FC<PathImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const labels = pathImplementationI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="implementation"
        kind="grid"
        gap={{ row: 22, column: 36 }}
        placements={[
          ['s0', 's7'],
          ['s1', 's6'],
          ['s2', 's5'],
          ['s3', 's4'],
        ]}
      >
        <FlowEntities
          items={labels.map((text, i) => ({
            id: `s${i}`,
            text: text
              .split('\n')
              .map((line, n) => ({ text: line, ...(n ? { font: { size: 12 }, fill: 'gray' } : {}) })),
            role: 'activity',
            ...(i === 2 || i === 7 ? { kind: 'docs.logic.important' } : {}),
            layout: { width: 300 },
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...labels.slice(1).flatMap((_, i) => (i === 3 ? [] : [{ source: `s${i}`, target: `s${i + 1}` }])),
          { source: 's3', target: 's4' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PathImplementation;
