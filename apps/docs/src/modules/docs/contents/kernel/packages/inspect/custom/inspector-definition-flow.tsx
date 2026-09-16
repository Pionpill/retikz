import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { inspectorDefinitionFlowI18n } from './inspector-definition-flow.i18n';

export type InspectorDefinitionFlowProps = Readonly<{ lang?: Lang }>;

export const InspectorDefinitionFlow: FC<InspectorDefinitionFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = inspectorDefinitionFlowI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()}>
      <FlowLayout id="figure" kind="linear" direction="down" align="end" gap={40}>
        <FlowLayout id="inputs-and-definition" kind="linear" direction="right" align="end" gap={24}>
          <FlowLayout id="inputs" kind="linear" direction="down" gap={32} align="center">
            <FlowEntities
              items={[
                {
                  id: 'final-output',
                  text: i18n.finalOutput,
                  role: 'activity',
                  layout: { minimumSize: { width: 0, height: 56 } },
                },
                {
                  id: 'user-options',
                  text: i18n.userOptions,
                  role: 'activity',
                  layout: { minimumSize: { width: 0, height: 56 }, margin: { bottom: 5 } },
                },
              ]}
            />
          </FlowLayout>
          <FlowGroup
            id="definition"
            caption={{ title: { text: i18n.definition, textColor: 'gray', font: { size: 12, weight: 'normal' } } }}
            border={{ stroke: 'lightgray', dashPattern: [4, 3] }}
            background={{ fill: 'lightgray', fillOpacity: 0.04 }}
            padding={10}
            cornerRadius={4}
          >
            <FlowLayout id="contract" kind="linear" direction="down" align="center" gap={32}>
              <FlowEntities
                items={[
                  {
                    id: 'subject-schema',
                    layout: { minimumSize: { width: 0, height: 56 } },
                    text: i18n.subjectSchema,
                    role: 'activity',
                  },
                ]}
              />
              <FlowLayout id="options-pipeline" kind="linear" direction="right" align="center" gap={16}>
                <FlowEntities
                  items={[
                    {
                      id: 'merge-options',
                      layout: { minimumSize: { width: 0, height: 56 } },
                      text: i18n.mergeOptionsInput,
                      role: 'activity',
                      kind: LogicFigureEntityKind.Important,
                    },
                    {
                      id: 'options-schema',
                      layout: { minimumSize: { width: 0, height: 56 } },
                      text: i18n.optionsSchema,
                      role: 'activity',
                    },
                    {
                      id: 'resolve-options',
                      text: i18n.resolveOptions,
                      role: 'activity',
                      kind: LogicFigureEntityKind.Important,
                    },
                    { id: 'inspect', text: i18n.inspect, role: 'activity', kind: LogicFigureEntityKind.Important },
                  ]}
                />
              </FlowLayout>
            </FlowLayout>
          </FlowGroup>
        </FlowLayout>
        <FlowLayout id="output" kind="linear" direction="right" gap={24} align="center">
          <FlowEntities
            items={[
              { id: 'ir', text: i18n.ir, role: 'activity' },
              { id: 'compile', text: i18n.compile, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'scene', text: i18n.scene, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'final-output', target: 'subject-schema' },
          { source: 'user-options', target: 'merge-options' },
          { source: 'merge-options', target: 'options-schema' },
          { source: 'subject-schema', target: 'inspect', routing: { kind: '-|', cornerRadius: 4 } },
          { source: 'options-schema', target: 'resolve-options' },
          { source: 'resolve-options', target: 'inspect', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'inspect', target: 'ir', routing: { kind: 'orthogonal', cornerRadius: 4 } },
          { source: 'ir', target: 'compile' },
          { source: 'compile', target: 'scene' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default InspectorDefinitionFlow;
