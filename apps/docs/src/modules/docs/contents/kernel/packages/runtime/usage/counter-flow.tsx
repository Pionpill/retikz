import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { counterFlowI18n } from './counter-flow.i18n';

/** 计数器流程图的语言配置 */
export type CounterFlowProps = Readonly<{ lang?: Lang }>;

/** 从定义到释放的计数器接入流程 */
const CounterFlow: FC<CounterFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = counterFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="right">
        <FlowLayout id="start-end" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'define', text: text.define, role: 'activity' },
              { id: 'dispose', text: text.dispose, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="registry-results" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'register', text: text.register, role: 'activity' },
              { id: 'read', text: text.read, role: 'activity', kind: LogicFigureEntityKind.Important },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="runtime" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'create', text: text.create, role: 'activity' },
              { id: 'update', text: text.update, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'define', target: 'register' },
          { source: 'register', target: 'create' },
          { source: 'create', target: 'update' },
          { source: 'update', target: 'read' },
          { source: 'read', target: 'dispose' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default CounterFlow;
