import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

/** 展示二维仿射矩阵的组合与应用顺序 */
const Demo: FC = () => (
  <FlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
    <FlowLayout kind="linear" id="affine" direction="right" align="center">
      <FlowLayout kind="linear" id="composition" direction="right" align="center">
        <FlowLayout kind="linear" id="matrix-inputs" direction="down" align="center">
          <FlowEntities
            items={[
              { id: 'inner', text: '内层矩阵（先执行）', role: 'activity', kind: 'docs.logic.important' },
              { id: 'outer', text: '外层矩阵（后执行）', role: 'activity', kind: 'docs.logic.important' },
            ]}
          />
        </FlowLayout>
        <FlowEntities items={[{ id: 'compose', text: '组合矩阵', role: 'activity', kind: 'docs.logic.important' }]} />
        <FlowEntities
          items={[{ id: 'combined-matrix', text: '合成矩阵', role: 'activity', kind: 'docs.logic.important' }]}
        />
      </FlowLayout>
      <FlowLayout kind="linear" id="application" direction="down" align="center" gap={32}>
        <FlowEntities items={[{ id: 'point', text: '输入点', role: 'participant' }]} />
        <FlowEntities items={[{ id: 'apply', text: '应用矩阵', role: 'activity', kind: 'docs.logic.important' }]} />
        <FlowEntities items={[{ id: 'result', text: '变换后点', role: 'participant' }]} />
      </FlowLayout>
    </FlowLayout>
    <FlowRelations
      items={[
        { source: 'inner', target: 'compose' },
        { source: 'outer', target: 'compose' },
        { source: 'compose', target: 'combined-matrix' },
        { source: 'point', target: 'apply' },
        {
          source: 'combined-matrix',
          target: 'apply',
          role: RelationRole.Dependency,
          kind: LogicFigureRelationKind.Secondary,
        },
        { source: 'apply', target: 'result' },
      ]}
    />
  </FlowDiagram>
);

export default Demo;
