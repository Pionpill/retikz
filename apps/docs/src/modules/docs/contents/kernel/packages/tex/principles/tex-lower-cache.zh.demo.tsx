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

/** 展示单个 lowerer 的公式缓存、解析与回写 */
const Demo: FC = () => (
  <FlowDiagram
    {...logicFigureGraphProps()}
    style={{ maxWidth: '100%', height: 'auto' }}
    layout={{ direction: 'down' }}
    relationKinds={logicFigureRelationKinds}
  >
    <FlowLayout
      kind="grid"
      id="cache"
      placements={[
        ['tex-request', 'cache-lookup', 'cached-content'],
        [null, 'mathjax-processing', 'parsing-result'],
      ]}
    >
      <FlowEntities
        items={[
          { id: 'tex-request', text: 'TeX 请求', role: 'participant' },
          { id: 'cache-lookup', text: '缓存查询', role: 'gateway' },
          {
            id: 'cached-content',
            text: '缓存内容',
            role: 'resource',
            kind: LogicFigureEntityKind.ImportantData,
          },
        ]}
      />
      <FlowEntities
        items={[
          { id: 'mathjax-processing', text: 'MathJax 处理', role: 'activity', kind: LogicFigureEntityKind.Important },
          { id: 'parsing-result', text: '解析结果', role: 'resource' },
        ]}
      />
    </FlowLayout>

    <FlowRelations
      items={[
        { source: 'tex-request', target: 'cache-lookup' },
        { source: 'cache-lookup', target: 'cached-content', label: '命中' },
        { source: 'cache-lookup', target: 'mathjax-processing', label: '未命中' },
        { source: 'mathjax-processing', target: 'parsing-result' },
        {
          source: 'parsing-result',
          target: 'cached-content',
          label: '加入缓存',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
