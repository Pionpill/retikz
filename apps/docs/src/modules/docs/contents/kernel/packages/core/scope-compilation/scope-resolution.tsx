import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeResolutionI18n } from './scope-resolution.i18n';

/** 阶段图使用的语言 */
export type ScopeResolutionProps = { lang?: Lang };

/** 展示真实阶段产物及其输入 */
const ScopeResolution: FC<ScopeResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const text = scopeResolutionI18n[lang];
  const stages = [
    { id: 's0', name: 'IRScope properties', state: true },
    { id: 's1', name: 'resolveScope', state: false },
    { id: 's2', name: 'CanonicalScope', state: true },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="scope-resolution"
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
                { text: 'ScopeResolveContext', font: { size: 12 } },
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
export default ScopeResolution;
