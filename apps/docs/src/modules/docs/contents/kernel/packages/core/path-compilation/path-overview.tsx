import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pathOverviewI18n } from './path-overview.i18n';

/** 路径主线图的语言 */
export type PathOverviewProps = { lang?: Lang };
/** 从声明到 Scene 的处理主线 */
const PathOverview: FC<PathOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const labels = pathOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="overview" kind="linear" direction="right" itemWidth="match-largest" gap={16}>
        <FlowEntities items={labels.map((text, i) => ({ id: `s${i}`, text, role: 'activity' }))} />
      </FlowLayout>
      <FlowRelations items={labels.slice(1).map((_, i) => ({ source: `s${i}`, target: `s${i + 1}` }))} />
    </PreviewFlowDiagram>
  );
};
export default PathOverview;
