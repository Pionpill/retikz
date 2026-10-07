import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  LogicFigureEntityKind,
  LogicFigureRelationKind,
  logicFigureGraphProps,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

import { runtimeArchitectureI18n } from './runtime-architecture.i18n';

/** Runtime 流程图的语言配置 */
export type RuntimeArchitectureProps = Readonly<{ lang?: Lang }>;

/** 完整输入经 Runtime 发布，注册表与观测由 Flow 组织为独立支路 */
const RuntimeArchitecture: FC<RuntimeArchitectureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = runtimeArchitectureI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout id="architecture" kind="linear" direction="right" align="center" gap={40}>
        <FlowEntities
          items={[{ id: 'input', text: i18n.input, role: 'state', kind: LogicFigureEntityKind.ImportantData }]}
        />
        <FlowGroup
          id="runtime-group"
          caption={{ title: { text: '@retikz/runtime', textColor: 'gray', font: { size: 12 } } }}
          padding={16}
          cornerRadius={4}
        >
          <FlowLayout id="runtime-content" kind="linear" direction="down" align="center" gap={40}>
            <FlowLayout id="registries" kind="linear" direction="right" align="center" gap={24}>
              <FlowEntities
                items={[
                  { id: 'sources', text: i18n.sources, role: 'resource' },
                  { id: 'computations', text: i18n.computations, role: 'resource' },
                ]}
              />
            </FlowLayout>
            <FlowEntities
              items={[
                { id: 'runtime', text: i18n.runtime, role: 'activity', kind: LogicFigureEntityKind.Important },
                { id: 'observation', text: i18n.observation, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              ]}
            />
          </FlowLayout>
        </FlowGroup>
        <FlowEntities
          items={[{ id: 'output', text: i18n.output, role: 'state', kind: LogicFigureEntityKind.ImportantData }]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'runtime' },
          { source: 'sources', target: 'runtime' },
          { source: 'computations', target: 'runtime' },
          { source: 'runtime', target: 'output' },
          { source: 'runtime', target: 'observation', role: 'dependency', kind: LogicFigureRelationKind.Secondary },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default RuntimeArchitecture;
