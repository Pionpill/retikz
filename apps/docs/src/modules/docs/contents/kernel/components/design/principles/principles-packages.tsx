import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { principlesPackagesI18n } from './principles-packages.i18n';

export type PrinciplesPackagesProps = { lang?: Lang };
const Demo: FC<PrinciplesPackagesProps> = props => {
  const text = principlesPackagesI18n[props.lang ?? 'zh'];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="packages" kind="linear" direction="right" align="center" gap={32}>
        <FlowLayout
          id="inputs"
          excludeFromBounds={['react', 'external']}
          kind="linear"
          direction="down"
          align="center"
          gap={12}
          itemWidth="match-largest"
        >
          <FlowEntities
            items={[
              { id: 'react', text: 'React JSX', role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'vanilla', text: 'Vanilla Input', role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'external', text: text.external, role: 'resource', kind: LogicFigureEntityKind.ImportantData },
            ]}
          />
        </FlowLayout>
        <FlowLayout
          id="core-with-dependencies"
          excludeFromBounds={['optional-capabilities']}
          kind="linear"
          direction="down"
          align="center"
        >
          <FlowGroup
            id="core-group"
            layout={{ direction: 'right', rankGap: 32 }}
            caption={{ title: { text: '@retikz/core', textColor: 'gray', font: { size: 12, weight: 'normal' } } }}
            border={{ stroke: 'lightgray', dashPattern: [4, 3] }}
            padding={{ top: 12, right: 12, bottom: 30, left: 12 }}
            cornerRadius={4}
          >
            <FlowEntities
              items={[
                { id: 'ir', text: 'IR', role: 'resource', kind: LogicFigureEntityKind.ImportantData },
                { id: 'compile', text: 'compileToScene', role: 'activity' },
                { id: 'scene', text: 'Scene', role: 'resource', kind: LogicFigureEntityKind.ImportantData },
              ]}
            />
          </FlowGroup>
          <FlowLayout id="optional-capabilities" kind="linear" direction="right" align="center">
            <FlowEntities
              items={[
                { id: 'tex', text: text.tex, role: 'activity', kind: LogicFigureEntityKind.Secondary },
                { id: 'inspect', text: text.inspect, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              ]}
            />
          </FlowLayout>
        </FlowLayout>
        <FlowEntities
          items={[{ id: 'render', text: 'render', role: 'activity', kind: LogicFigureEntityKind.Important }]}
        />
        <FlowLayout gap={12} id="outputs" kind="linear" direction="down" align="center" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'svg', text: 'SVG', role: 'activity' },
              { id: 'canvas', text: 'Canvas', role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'react', target: 'ir' },
          { source: 'vanilla', target: 'ir' },
          { source: 'external', target: 'ir' },
          { source: 'ir', target: 'compile' },
          { source: 'compile', target: 'scene' },
          { source: 'scene', target: 'render' },
          { source: 'render', target: 'svg' },
          { source: 'render', target: 'canvas' },
          { source: 'tex', target: 'compile', role: RelationRole.Dependency, style: { dashPattern: [4, 3] } },
          { source: 'compile', target: 'inspect', role: RelationRole.Dependency, style: { dashPattern: [4, 3] } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;
