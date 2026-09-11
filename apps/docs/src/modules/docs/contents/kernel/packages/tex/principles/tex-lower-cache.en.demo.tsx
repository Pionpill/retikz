import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  LogicFigureEntityKind,
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

/** Shows one lowerer's formula cache, parsing, and write-back */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down' }} relationKinds={logicFigureRelationKinds}>
    <FlowLayout id="cache" direction="down" align="end" gap={24}>
      <FlowLayout id="cache-hit-row" direction="right" align="center" gap={44}>
        <FlowEntities
          items={[
            { id: 'tex-request', text: 'TeX request', role: 'participant' },
            { id: 'cache-lookup', text: 'Cache lookup', role: 'gateway' },
            {
              id: 'cached-content',
              text: 'Cached content',
              role: 'resource',
              kind: LogicFigureEntityKind.ImportantData,
            },
          ]}
        />
      </FlowLayout>
      <FlowLayout id="cache-miss-row" direction="right" align="end" gap={56}>
        <FlowEntities
          items={[
            {
              id: 'mathjax-processing',
              text: 'MathJax processing',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
            },
            { id: 'parsing-result', text: 'Parsing result', role: 'resource' },
          ]}
        />
      </FlowLayout>
    </FlowLayout>

    <FlowRelations
      items={[
        { source: 'tex-request', target: 'cache-lookup' },
        { source: 'cache-lookup', target: 'cached-content', label: 'hit' },
        { source: 'cache-lookup', target: 'mathjax-processing', label: 'miss' },
        { source: 'mathjax-processing', target: 'parsing-result' },
        {
          source: 'parsing-result',
          target: 'cached-content',
          label: 'Add to cache',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
