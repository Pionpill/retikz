import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { resolutionOverviewI18n } from './resolution-overview.i18n';

/** 语义解析总览图的语言 */
export type ResolutionOverviewProps = { lang?: Lang };

/** 区分外部输入校验与依赖上下文的语义解析 */
const ResolutionOverview: FC<ResolutionOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = resolutionOverviewI18n[lang];
  const activities = ['schema', 'resolve', 'compile'] as const;
  const states = ['external', 'typed', 'source', 'context', 'canonical'] as const;

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="resolution"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          ['external', 'schema', null],
          ['typed', 'source', null],
          [null, 'resolve', 'context'],
          [null, 'canonical', null],
          [null, 'compile', null],
        ]}
      >
        <FlowEntities
          items={activities.map(id => ({
            id,
            role: 'activity',
            text: text[id],
            layout: { width: 200 },
            ...(id === 'resolve' ? { kind: 'docs.logic.important' } : {}),
          }))}
        />
        <FlowEntities
          items={states.map(id => ({
            id,
            role: 'state',
            text: text[id],
            layout: { width: 180 },
            ...(id === 'canonical' ? { kind: 'docs.logic.importantData' } : {}),
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'external', target: 'schema' },
          { source: { id: 'schema', anchor: 'bottom' }, target: { id: 'source', anchor: 'top' } },
          { source: 'typed', target: 'source' },
          { source: 'source', target: 'resolve' },
          { source: 'context', target: 'resolve' },
          { source: 'resolve', target: 'canonical' },
          { source: 'canonical', target: 'compile' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ResolutionOverview;
