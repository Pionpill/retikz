import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { channelPipelineI18n } from './channel-pipeline.i18n';

/** 源码导览图语言 */
export type ChannelPipelineProps = { lang?: Lang };
/** 注册后的通道结果由节点和图例两条路径消费 */
const ChannelPipeline: FC<ChannelPipelineProps> = props => {
  const { lang = 'zh' } = props;
  const text = (index: number) =>
    channelPipelineI18n[lang][index].map((line, row) => ({
      text: line,
      ...(row ? { fill: 'gray', font: { size: 12 } } : {}),
    }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      defaultFlow={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="pipeline" kind="linear" direction="right">
        <FlowLayout id="prepare" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'registry', text: text(0), role: 'activity' },
              { id: 'resolve', text: text(1), role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="values" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'row', text: text(2), role: 'activity' },
              { id: 'descriptors', text: text(4), role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="outputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'node', text: text(3), role: 'activity', kind: 'docs.logic.important' },
              { id: 'legend', text: text(5), role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'registry', target: 'resolve' },
          { source: 'resolve', target: 'row' },
          { source: 'resolve', target: 'descriptors' },
          { source: 'row', target: 'node' },
          { source: 'descriptors', target: 'legend' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ChannelPipeline;
