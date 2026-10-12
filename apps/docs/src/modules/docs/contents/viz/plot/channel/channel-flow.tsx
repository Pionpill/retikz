import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { channelFlowI18n } from './channel-flow.i18n';

/** 通道解析流程图语言 */
export type ChannelFlowProps = { lang?: Lang };

/** 位置绑定进入坐标投影，其余绑定与通道规则汇入解析器 */
const ChannelFlow: FC<ChannelFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = channelFlowI18n[lang];
  const label = (value: string) =>
    value.split('\n').map((line, index) => ({
      text: line,
      font: { size: index === 0 ? 14 : 12 },
      ...(index === 0 ? {} : { fill: 'gray' }),
    }));

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="channels" kind="linear" direction="right">
        <FlowLayout id="inputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'binding', role: 'resource', text: label(text.binding) },
              { id: 'builtin', role: 'resource', text: label(text.builtin) },
              { id: 'custom', role: 'resource', text: label(text.custom) },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="preparation" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'position', role: 'activity', text: label(text.position) },
              { id: 'registry', role: 'resource', text: label(text.registry) },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[
            { id: 'resolver', role: 'activity', kind: LogicFigureEntityKind.Important, text: label(text.resolver) },
          ]}
        />
        <FlowLayout id="outputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'delivery', role: 'resource', text: label(text.delivery) },
              { id: 'descriptor', role: 'resource', text: label(text.descriptor) },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'builtin', target: 'registry' },
          { source: 'custom', target: 'registry' },
          { source: 'registry', target: 'resolver' },
          { source: 'binding', target: 'resolver', routing: { kind: '-|' } },
          { source: 'binding', target: 'position' },
          { source: 'resolver', target: 'delivery' },
          { source: 'resolver', target: 'descriptor' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ChannelFlow;
