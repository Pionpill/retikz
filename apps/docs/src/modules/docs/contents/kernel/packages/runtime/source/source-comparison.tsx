import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { sourceComparisonI18n } from './source-comparison.i18n';

/** 状态比较图的语言配置 */
export type SourceComparisonProps = Readonly<{ lang?: Lang }>;

/** 比较前后内部值并决定是否保留候选状态 */
const SourceComparison: FC<SourceComparisonProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = sourceComparisonI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="comparison" kind="linear" direction="right" align="center">
        <FlowLayout id="values" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'previous', text: i18n.previous, role: 'state' },
              { id: 'next', text: i18n.next, role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[{ id: 'equals', text: i18n.compare, role: 'gateway', kind: LogicFigureEntityKind.ImportantData }]}
        />
        <FlowLayout id="outcomes" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'equal', text: i18n.equal, role: 'activity' },
              { id: 'changed', text: i18n.changed, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'previous', target: 'equals', label: 'TValue' },
          { source: 'next', target: 'equals', label: 'TValue' },
          { source: 'equals', target: 'equal', label: 'true' },
          { source: 'equals', target: 'changed', label: 'false' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default SourceComparison;
