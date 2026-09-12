import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** Shows the useLowerTex React hook lifecycle */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down' }}>
    <FlowLayout kind="linear" id="lifecycle" direction="down" align="center" gap={28}>
      <FlowLayout kind="linear" id="configuration-row" direction="right" align="center" gap={36}>
        <FlowEntities
          items={[
            {
              id: 'configuration-change',
              text: 'Configuration change',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
            },
            { id: 'clear-lowerer', text: 'Reset lowerer', role: 'activity' },
            { id: 'stale-result', text: 'Discard stale result', role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowLayout kind="linear" id="failure-row" direction="right" align="center" gap={36}>
        <FlowEntities
          items={[
            { id: 'initialization-failure', text: 'Initialization failure', role: 'activity' },
            { id: 'remove-failed-entry', text: 'Remove failed entry', role: 'activity' },
            { id: 'retry-mount', text: 'Later mount', role: 'state' },
          ]}
        />
      </FlowLayout>
    </FlowLayout>

    <FlowRelations
      items={[
        { source: 'configuration-change', target: 'clear-lowerer' },
        { source: 'clear-lowerer', target: 'stale-result' },
        { source: 'initialization-failure', target: 'remove-failed-entry' },
        { source: 'remove-failed-entry', target: 'retry-mount' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
