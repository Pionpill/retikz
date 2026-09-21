import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { principlesRegistryI18n } from './principles-registry.i18n';

export type PrinciplesRegistryProps = { lang?: Lang };
const Demo: FC<PrinciplesRegistryProps> = props => {
  const text = principlesRegistryI18n[props.lang ?? 'zh'];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="registry-flow" kind="linear" direction="right" gap={28} align="center">
        <FlowGroup
          id="definition-contract"
          caption={{ title: { text: 'XxxDefinition', textColor: 'gray', font: { size: 12, weight: 'normal' } } }}
          border={{ stroke: 'lightgray', dashPattern: [4, 3] }}
          padding={12}
          cornerRadius={4}
        >
          <FlowLayout id="definitions" kind="linear" direction="down" gap={24} itemWidth="match-largest">
            <FlowEntities
              items={[
                { id: 'builtins', text: text.builtins, role: 'activity', kind: LogicFigureEntityKind.Important },
                { id: 'custom', text: text.custom, role: 'activity', kind: LogicFigureEntityKind.Important },
              ]}
            />
          </FlowLayout>
        </FlowGroup>
        <FlowEntities
          items={[
            { id: 'resolver', text: text.resolver, role: 'activity' },
            { id: 'registry', text: text.registry, role: 'resource', kind: LogicFigureEntityKind.ImportantData },
            { id: 'consumer', text: text.consumer, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'builtins', target: 'resolver' },
          { source: 'custom', target: 'resolver' },
          { source: 'resolver', target: 'registry' },
          { source: 'registry', target: 'consumer' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;
