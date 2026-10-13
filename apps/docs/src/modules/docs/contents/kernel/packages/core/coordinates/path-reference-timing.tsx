import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pathReferenceTimingI18n } from './path-reference-timing.i18n';

/** 兄弟 Scope 引用时机图的语言 */
export type PathReferenceTimingProps = { lang?: Lang };

/** 说明共享 Map 不会让路径提前访问尚未遍历的兄弟 Scope */
const PathReferenceTiming: FC<PathReferenceTimingProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathReferenceTimingI18n[lang];
  const stages = ['registerA', 'resolveA', 'registerB', 'resolveB'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="timing" kind="linear" direction="right" itemWidth="match-largest" gap={20}>
        <FlowEntities
          items={stages.map(id => ({
            id,
            text: text[id].split('\n').map((line, index) => ({
              text: line,
              ...(index === 0 ? {} : { font: { size: 12 }, fill: 'gray' }),
            })),
            role: 'activity',
            layout: { width: 150 },
            ...(id === 'resolveA' ? { status: 'error' } : id === 'resolveB' ? { status: 'success' } : {}),
          }))}
        />
      </FlowLayout>
      <FlowRelations items={stages.slice(1).map((id, index) => ({ source: stages[index], target: id }))} />
    </PreviewFlowDiagram>
  );
};

export default PathReferenceTiming;
