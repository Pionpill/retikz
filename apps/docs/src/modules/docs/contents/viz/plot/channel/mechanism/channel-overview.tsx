import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { channelOverviewI18n } from './channel-overview.i18n';

/** 总览图语言 */
export type ChannelOverviewProps = { lang?: Lang };
/** 同一次映射分别服务属性交付与图例说明 */
const ChannelOverview: FC<ChannelOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = (index: number) =>
    channelOverviewI18n[lang][index].map((line, row) => ({
      text: line,
      ...(row ? { fill: 'gray', font: { size: 12 } } : {}),
    }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="overview" kind="linear" direction="right">
        <FlowEntities
          items={[
            { id: 'input', text: text(0), role: 'resource' },
            { id: 'resolve', text: text(1), role: 'activity' },
          ]}
        />
        <FlowLayout id="outputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'delivery', text: text(2), role: 'activity', kind: 'docs.logic.important' },
              { id: 'descriptor', text: text(3), role: 'resource', kind: 'docs.logic.importantData' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'resolve' },
          { source: 'resolve', target: 'delivery' },
          { source: 'resolve', target: 'descriptor' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ChannelOverview;
