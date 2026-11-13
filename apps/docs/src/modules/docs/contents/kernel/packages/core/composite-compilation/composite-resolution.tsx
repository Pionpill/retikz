import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compositeResolutionI18n } from './composite-resolution.i18n';

/** 阶段图使用的语言 */
export type CompositeResolutionProps = { lang?: Lang };

/** 展示真实阶段产物及其输入 */
const CompositeResolution: FC<CompositeResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const text = compositeResolutionI18n[lang];
  const stages = [
    { id: 's0', name: 'IRComposite', state: true },
    { id: 's1', name: 'bindComposite \u2192 resolveComposite', state: false },
    { id: 's2', name: 'CompositeResolution', state: true },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="composite-resolution"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 's0'],
          ['context', 's1'],
          [null, 's2'],
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
                { text: 'CompositeRegistry + irPath', font: { size: 12 } },
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
          { source: { id: 'context', anchor: 'right' }, target: { id: 's1', anchor: 'left' } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompositeResolution;
