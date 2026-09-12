import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 展示 useLowerTex 的 React hook 生命周期 */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down' }}>
    <FlowLayout kind="linear" id="lifecycle" direction="down" align="center" gap={28}>
      <FlowLayout kind="linear" id="configuration-row" direction="right" align="center" gap={36}>
        <FlowEntities
          items={[
            { id: 'configuration-change', text: '配置变更', role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'clear-lowerer', text: '重置 lowerer', role: 'activity' },
            { id: 'stale-result', text: '丢弃过期结果', role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowLayout kind="linear" id="failure-row" direction="right" align="center" gap={36}>
        <FlowEntities
          items={[
            { id: 'initialization-failure', text: '初始化失败', role: 'activity' },
            { id: 'remove-failed-entry', text: '移除失败项', role: 'activity' },
            { id: 'retry-mount', text: '再次挂载', role: 'state' },
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
