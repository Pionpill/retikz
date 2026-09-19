import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeCoordinateProjectionI18n } from './scope-coordinate-projection.i18n';
import { scopeFlowDefaults, scopeFlowText } from './scope-flow';

/** 坐标换算流程的语言 */
export type ScopeCoordinateProjectionProps = Readonly<{ lang?: Lang }>;

/** 三个对齐动作显示同一坐标如何换算，不把参数单独画成节点 */
const ScopeCoordinateProjection: FC<ScopeCoordinateProjectionProps> = props => {
  const { lang = 'zh' } = props;
  const t = scopeCoordinateProjectionI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={scopeFlowDefaults}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="coordinate-actions" kind="linear" direction="right" gap={26} itemWidth="match-largest">
        <FlowEntities
          items={(['inverse', 'add', 'forward'] as const).map(id => ({
            id,
            role: 'activity',
            text: scopeFlowText(t.nodes[id]),
            ...(id === 'add' ? { kind: LogicFigureEntityKind.Important } : {}),
          }))}
        />
      </FlowLayout>

      <FlowRelations
        items={[
          { source: 'inverse', target: 'add' },
          { source: 'add', target: 'forward' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ScopeCoordinateProjection;
