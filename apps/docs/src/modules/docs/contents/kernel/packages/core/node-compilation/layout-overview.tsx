import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutOverviewI18n } from './layout-overview.i18n';

/** 节点布局总览的语言 */
export type LayoutOverviewProps = { lang?: Lang };

/** 从测量到布局结果的主线 */
const LayoutOverview: FC<LayoutOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const labels = layoutOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="overview" kind="linear" direction="right" itemWidth="match-largest" gap={20}>
        <FlowEntities items={labels.map((text, i) => ({ id: `step-${i}`, text, role: 'activity' }))} />
      </FlowLayout>
      <FlowRelations items={labels.slice(1).map((_, i) => ({ source: `step-${i}`, target: `step-${i + 1}` }))} />
    </PreviewFlowDiagram>
  );
};
export default LayoutOverview;
