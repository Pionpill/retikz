import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compositeFlowI18n } from './composite-flow.i18n';

/** 阶段图使用的语言 */
export type CompositeFlowProps = { lang?: Lang };

/** 展示真实阶段产物及其输入 */
const CompositeFlow: FC<CompositeFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = compositeFlowI18n[lang];
  const stages = [
    { id: 's0', name: 'IRComposite', state: true },
    { id: 's1', name: 'resolve \u2192 CompositeResolution', state: false },
    { id: 's2', name: 'CompositeCompileResult', state: false },
    { id: 's3', name: 'Children \u2192 Scene contributions', state: true },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="composite-flow"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 's0'],
          [null, 's1'],
          ['context', 's2'],
          [null, 's3'],
        ]}
      >
        <FlowEntities
          items={stages.map(item => ({
            id: item.id,
            role: item.state ? 'state' : 'activity',
            layout: { width: 300 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
        <FlowEntities
          items={[
            {
              id: 'context',
              role: 'state',
              kind: 'docs.logic.secondary',
              layout: { width: 260 },
              text: [
                { text: 'CompositeCompileContext', font: { size: 12 } },
                { text: text.context, font: { size: 12 }, fill: 'gray' },
              ],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...stages.slice(1).map((item, index) => ({
            source: { id: stages[index].id, anchor: 'bottom' as const },
            target: { id: item.id, anchor: 'top' as const },
          })),
          { source: { id: 'context', anchor: 'right' }, target: { id: 's2', anchor: 'left' } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompositeFlow;
